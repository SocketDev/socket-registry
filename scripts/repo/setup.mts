/**
 * @file Developer setup script. Checks prerequisites and installs pinned
 *   external tools (currently: zizmor for GitHub Actions security scanning).
 *   Usage: pnpm run setup # Check prerequisites, install tools pnpm run setup
 *   --quiet # Minimal output (for postinstall)
 */

import crypto from 'node:crypto'
import { createReadStream, existsSync, readFileSync } from 'node:fs'
import { mkdir, open, readFile, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

import { WIN32 } from '@socketsecurity/lib-stable/constants/platform'
import { isErrnoException } from '@socketsecurity/lib-stable/errors/predicates'
import { safeDelete } from '@socketsecurity/lib-stable/fs/safe'
import { getDefaultLogger } from '@socketsecurity/lib-stable/logger/default'
import { spawn } from '@socketsecurity/lib-stable/process/spawn/child'

import { REPO_ROOT } from '../fleet/paths.mts'
import { errorMessage } from '@socketsecurity/lib-stable/errors/message'

const logger = getDefaultLogger()
const quiet = process.argv.includes('--quiet')

const log = {
  error: (msg: string) => logger.error(msg),
  info: (msg: string) => !quiet && logger.info(msg),
  step: (msg: string) => !quiet && logger.substep(msg),
  success: (msg: string) => !quiet && logger.success(msg),
  warn: (msg: string) => logger.warn(msg),
}

// Tools cached under node_modules/.cache/external-tools/ (auto-gitignored).
export function getCacheDir(): string {
  if (process.env['EXTERNAL_TOOLS_CACHE']) {
    return process.env['EXTERNAL_TOOLS_CACHE']
  }
  return path.join(REPO_ROOT, 'node_modules', '.cache', 'external-tools')
}

export function getToolCachePath(tool: string, version: string): string {
  const archMap: Record<string, string> = { arm64: 'aarch64', x64: 'x86_64' }
  const osMap: Record<string, string> = {
    darwin: 'darwin',
    linux: 'linux',
    win32: 'win32',
  }
  const target = `${osMap[process.platform] || process.platform}-${archMap[process.arch] || process.arch}`
  return path.join(getCacheDir(), tool, `${version}-${target}`)
}

/**
 * Compute a Subresource Integrity (SRI) string for a file. Format:
 * `sha256-<base64>`. Streams the file so multi-GB binaries don't blow the heap.
 * Matches the format that update-external-tools.mts writes into
 * external-tools.json's `platforms.<key>.integrity` field.
 */
export function computeIntegrity(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256')
    const stream = createReadStream(filePath)
    stream.on('data', data => hash.update(data))
    stream.on('end', () => resolve(`sha256-${hash.digest('base64')}`))
    stream.on('error', reject)
  })
}

export function verifyCacheIntegrity(
  cachePath: string,
  expectedIntegrity: string,
): boolean {
  const checksumFile = path.join(cachePath, '.integrity')
  if (!existsSync(checksumFile)) {
    return false
  }
  try {
    return readFileSync(checksumFile, 'utf8').trim() === expectedIntegrity
  } catch {
    return false
  }
}

export function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

export async function acquireLock(
  lockPath: string,
  timeoutMs: number = 120_000,
): Promise<() => Promise<void>> {
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
    } catch (err: unknown) {
      if (isErrnoException(err) && err.code === 'EEXIST') {
        try {
          const pid = parseInt(readFileSync(lockPath, 'utf8').trim(), 10)
          if (pid && !isProcessAlive(pid)) {
            await unlink(lockPath).catch(() => {})
            continue
          }
        } catch {}
        await new Promise<void>(r => setTimeout(r, 500))
        continue
      }
      throw err
    }
  }
  throw new Error(`Timed out waiting for lock: ${lockPath}`)
}

interface PlatformEntry {
  asset: string
  integrity: string
}

interface ToolConfig {
  platforms?: Record<string, PlatformEntry> | undefined
  release?: string | undefined
  repository: string
  version: string
}

export async function downloadAndVerify(
  tool: string,
  config: ToolConfig,
): Promise<string | undefined> {
  const platform = process.platform === 'win32' ? 'win' : process.platform
  const platformKey = `${platform}-${process.arch}`
  const platformEntry = config.platforms?.[platformKey]
  if (!platformEntry) {
    log.warn(`No ${tool} binary available for ${platformKey}`)
    return undefined
  }

  const assetName = platformEntry.asset
  const expectedIntegrity = platformEntry.integrity
  if (!assetName || !expectedIntegrity) {
    log.warn(`No integrity for ${tool} on ${platformKey}`)
    return undefined
  }

  const { version } = config
  const binaryName = WIN32 ? `${tool}.exe` : tool
  const cachePath = getToolCachePath(tool, version)
  const binaryPath = path.join(cachePath, binaryName)

  // Check cache with integrity verification.
  if (
    existsSync(binaryPath) &&
    verifyCacheIntegrity(cachePath, expectedIntegrity)
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
      verifyCacheIntegrity(cachePath, expectedIntegrity)
    ) {
      log.step(`Using cached ${tool} ${version}`)
      return binaryPath
    }

    // Clean corrupted cache.
    if (existsSync(cachePath)) {
      await safeDelete(cachePath)
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

      // Verify integrity.
      log.step('Verifying integrity…')
      const actual = await computeIntegrity(archivePath)
      if (actual !== expectedIntegrity) {
        throw new Error(
          `Integrity mismatch for ${tool} ${version}:\n` +
            `  Expected: ${expectedIntegrity}\n` +
            `  Actual:   ${actual}`,
        )
      }

      // Extract.
      log.step('Extracting…')
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
      await writeFile(path.join(cachePath, '.integrity'), expectedIntegrity)

      await safeDelete(tmpDir)
      log.success(`${tool} ${version} installed`)
      return path.join(cachePath, binaryName)
    } catch (e) {
      await safeDelete(tmpDir)
      throw e
    }
  } finally {
    await releaseLock()
  }
}

async function main(): Promise<void> {
  if (!quiet) {
    logger.log('')
    logger.log('🔧 Developer Setup')
    logger.log('')
  }

  // Load external tools config.
  const configPath = path.join(REPO_ROOT, 'external-tools.json')
  if (!existsSync(configPath)) {
    log.warn('No external-tools.json found')
    return
  }
  const config = JSON.parse(await readFile(configPath, 'utf8')) as {
    tools?: Record<string, ToolConfig> | undefined
  }

  let allOk = true
  for (const [tool, toolConfig] of Object.entries(config.tools ?? {})) {
    if (toolConfig.release !== 'asset') {
      continue
    }
    try {
      const binaryPath = await downloadAndVerify(tool, toolConfig)
      if (binaryPath) {
        log.info(`${tool} ${toolConfig.version}: ${binaryPath}`)
      } else {
        log.warn(`${tool}: skipped (unsupported platform)`)
      }
    } catch (err: unknown) {
      log.error(`Failed to install ${tool}: ${errorMessage(err)}`)
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
