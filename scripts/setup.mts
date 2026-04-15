/**
 * @fileoverview Developer setup script.
 *
 * Checks prerequisites and installs pinned external tools
 * (currently: zizmor for GitHub Actions security scanning).
 *
 * Usage:
 *   pnpm run setup                # Check prerequisites, install tools
 *   pnpm run setup --quiet        # Minimal output (for postinstall)
 */

import { createHash } from 'node:crypto'
import { createReadStream, existsSync, readFileSync } from 'node:fs'
import { mkdir, open, readFile, rm, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

import { WIN32 } from '@socketsecurity/lib/constants/platform'
import { getDefaultLogger } from '@socketsecurity/lib/logger'
import { spawn } from '@socketsecurity/lib/spawn'

const logger = getDefaultLogger()
const quiet = process.argv.includes('--quiet')

const log = {
  error: msg => logger.error(msg),
  info: msg => !quiet && logger.info(msg),
  step: msg => !quiet && logger.substep(msg),
  success: msg => !quiet && logger.success(msg),
  warn: msg => logger.warn(msg),
}

// Tools cached in repo root (.cache/external-tools/), gitignored via **/.cache.
function getCacheDir() {
  if (process.env.EXTERNAL_TOOLS_CACHE) {
    return process.env.EXTERNAL_TOOLS_CACHE
  }
  return path.join(process.cwd(), '.cache', 'external-tools')
}

function getToolCachePath(tool, version) {
  const archMap = { arm64: 'aarch64', x64: 'x86_64' }
  const osMap = { darwin: 'darwin', linux: 'linux', win32: 'win32' }
  const target = `${osMap[process.platform] || process.platform}-${archMap[process.arch] || process.arch}`
  return path.join(getCacheDir(), tool, `${version}-${target}`)
}

function computeSha256(filePath) {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256')
    const stream = createReadStream(filePath)
    stream.on('data', data => hash.update(data))
    stream.on('end', () => resolve(hash.digest('hex')))
    stream.on('error', reject)
  })
}

function verifyCacheIntegrity(cachePath, expectedSha256) {
  const checksumFile = path.join(cachePath, '.checksum')
  if (!existsSync(checksumFile)) return false
  try {
    return readFileSync(checksumFile, 'utf8').trim() === expectedSha256
  } catch {
    return false
  }
}

function isProcessAlive(pid) {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

async function acquireLock(lockPath, timeoutMs = 120_000) {
  await mkdir(path.dirname(lockPath), { recursive: true })
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const fd = await open(lockPath, 'wx')
      await fd.writeFile(String(process.pid))
      await fd.close()
      return async () => {
        await unlink(lockPath).catch(() => {})
      }
    } catch (err) {
      if (err.code === 'EEXIST') {
        try {
          const pid = parseInt(readFileSync(lockPath, 'utf8').trim(), 10)
          if (pid && !isProcessAlive(pid)) {
            await unlink(lockPath).catch(() => {})
            continue
          }
        } catch {}
        await new Promise(r => setTimeout(r, 500))
        continue
      }
      throw err
    }
  }
  throw new Error(`Timed out waiting for lock: ${lockPath}`)
}

async function downloadAndVerify(tool, config) {
  const platform = process.platform === 'win32' ? 'win' : process.platform
  const platformKey = `${platform}-${process.arch}`
  const platformEntry = config.checksums?.[platformKey]
  if (!platformEntry) {
    log.warn(`No ${tool} binary available for ${platformKey}`)
    return undefined
  }

  const assetName = platformEntry.asset
  const expectedSha256 = platformEntry.sha256
  if (!assetName || !expectedSha256) {
    log.warn(`No checksum for ${tool} on ${platformKey}`)
    return undefined
  }

  const { version } = config
  const binaryName = WIN32 ? `${tool}.exe` : tool
  const cachePath = getToolCachePath(tool, version)
  const binaryPath = path.join(cachePath, binaryName)

  // Check cache with integrity verification.
  if (
    existsSync(binaryPath) &&
    verifyCacheIntegrity(cachePath, expectedSha256)
  ) {
    log.step(`Using cached ${tool} ${version}`)
    return binaryPath
  }

  const lockPath = path.join(getCacheDir(), `.lock-${tool}-${version}`)
  const releaseLock = await acquireLock(lockPath)

  try {
    // Re-check after lock (another process may have completed).
    if (
      existsSync(binaryPath) &&
      verifyCacheIntegrity(cachePath, expectedSha256)
    ) {
      log.step(`Using cached ${tool} ${version}`)
      return binaryPath
    }

    // Clean corrupted cache.
    if (existsSync(cachePath)) {
      await rm(cachePath, { recursive: true, force: true })
    }

    const repo = config.repository.replace(/^[^:]+:/, '')
    const tmpDir = path.join(
      getCacheDir(),
      `.tmp-${tool}-${version}-${process.pid}`,
    )
    await mkdir(tmpDir, { recursive: true })
    const url = `https://github.com/${repo}/releases/download/v${version}/${assetName}`
    const archivePath = path.join(tmpDir, assetName)

    try {
      log.step(`Downloading ${tool} ${version}...`)
      const result = await spawn(
        'curl',
        ['-fSL', '--retry', '3', '-o', archivePath, url],
        { stdio: quiet ? 'pipe' : 'inherit', shell: WIN32 },
      )
      if ((result.code ?? 0) !== 0) {
        throw new Error(`Download failed: ${url}`)
      }

      // Verify checksum.
      log.step('Verifying checksum...')
      const actual = await computeSha256(archivePath)
      if (actual !== expectedSha256) {
        throw new Error(
          `Checksum mismatch for ${tool} ${version}:\n` +
            `  Expected: ${expectedSha256}\n` +
            `  Actual:   ${actual}`,
        )
      }

      // Extract.
      log.step('Extracting...')
      if (assetName.endsWith('.zip')) {
        const unzipResult = await spawn(
          WIN32 ? 'powershell' : 'unzip',
          WIN32
            ? [
                '-Command',
                `Expand-Archive -Path '${archivePath}' -DestinationPath '${tmpDir}' -Force`,
              ]
            : ['-q', '-o', archivePath, '-d', tmpDir],
          { stdio: 'pipe', shell: WIN32 },
        )
        if ((unzipResult.code ?? 0) !== 0) {
          throw new Error(`Extraction failed for ${archivePath}`)
        }
      } else {
        const tarResult = await spawn(
          'tar',
          ['xf', archivePath, '-C', tmpDir],
          { stdio: 'pipe', shell: WIN32 },
        )
        if ((tarResult.code ?? 0) !== 0) {
          throw new Error(`Extraction failed for ${archivePath}`)
        }
      }

      // Write checksum marker, then move to cache.
      await mkdir(cachePath, { recursive: true })
      const extractedBinary = path.join(tmpDir, binaryName)
      if (!existsSync(extractedBinary)) {
        throw new Error(`Binary not found after extraction: ${extractedBinary}`)
      }

      const { copyFile, chmod } = await import('node:fs/promises')
      await copyFile(extractedBinary, path.join(cachePath, binaryName))
      if (!WIN32) {
        await chmod(path.join(cachePath, binaryName), 0o755)
      }
      await writeFile(path.join(cachePath, '.checksum'), expectedSha256)

      await rm(tmpDir, { recursive: true, force: true }).catch(() => {})
      log.success(`${tool} ${version} installed`)
      return path.join(cachePath, binaryName)
    } catch (err) {
      await rm(tmpDir, { recursive: true, force: true }).catch(() => {})
      throw err
    }
  } finally {
    await releaseLock()
  }
}

async function main(): Promise<void> {
  if (!quiet) {
    logger.log('\n🔧 Developer Setup\n')
  }

  // Load external tools config.
  const configPath = path.join(process.cwd(), 'external-tools.json')
  if (!existsSync(configPath)) {
    log.warn('No external-tools.json found')
    return
  }
  const config = JSON.parse(await readFile(configPath, 'utf8'))

  let allOk = true
  for (const [tool, toolConfig] of Object.entries(config)) {
    if (toolConfig.release !== 'asset') continue
    try {
      const binaryPath = await downloadAndVerify(tool, toolConfig)
      if (binaryPath) {
        log.info(`${tool} ${toolConfig.version}: ${binaryPath}`)
      } else {
        log.warn(`${tool}: skipped (unsupported platform)`)
      }
    } catch (err) {
      log.error(`Failed to install ${tool}: ${err.message}`)
      allOk = false
    }
  }

  if (!quiet) {
    if (allOk) {
      logger.success('Setup complete')
    } else {
      logger.warn('Setup completed with warnings')
    }
    logger.log('')
  }
}

main().catch((e: unknown) => {
  logger.error(e)
  process.exitCode = 1
})
