/**
 * @fileoverview Downloads the sfw-free binary and injects a pnpm shim into
 * GITHUB_PATH so every subsequent `pnpm` invocation in the job is transparently
 * wrapped by `sfw`. Must run before any `pnpm install` step.
 *
 * Fetches release metadata from the GitHub API to get the correct download URL
 * and SHA256 digest, then verifies the binary after download.
 *
 * Usage (GitHub Actions composite step):
 *   shell: bash
 *   run: node "${{ github.action_path }}/setup-sfw.mjs"
 */

import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import https from 'node:https'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'

// Platform → sfw release asset name.
const PLATFORM_MAP = {
  __proto__: null,
  'darwin-arm64': 'sfw-free-macos-arm64',
  'darwin-x64': 'sfw-free-macos-x86_64',
  'linux-arm64': 'sfw-free-linux-arm64',
  'linux-x64': 'sfw-free-linux-x86_64',
  'win32-x64': 'sfw-free-windows-x86_64.exe',
}

const WIN32 = process.platform === 'win32'
const platformKey = `${process.platform}-${process.arch}`
const assetName = PLATFORM_MAP[platformKey]

if (!assetName) {
  console.error(`Unsupported platform/arch: ${platformKey}`)
  process.exitCode = 1
  throw new Error(`unsupported platform "${platformKey}"`)
}

/**
 * Fetch a URL as a parsed JSON object, following redirects.
 * @param {string} url
 * @param {object} headers
 * @returns {Promise<unknown>}
 */
function fetchJson(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const request = currentUrl => {
      https
        .get(currentUrl, { headers }, res => {
          if (
            res.statusCode >= 300 &&
            res.statusCode < 400 &&
            res.headers.location
          ) {
            request(res.headers.location)
            return
          }
          if (res.statusCode !== 200) {
            reject(new Error(`fetch failed with status ${res.statusCode}`))
            return
          }
          const chunks = []
          res.on('data', chunk => chunks.push(chunk))
          res.on('end', () => {
            try {
              resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')))
            } catch (e) {
              reject(new Error(`failed to parse JSON: ${e.message}`))
            }
          })
          res.on('error', reject)
        })
        .on('error', reject)
    }
    request(url)
  })
}

/**
 * Download a URL to a destination file, following redirects.
 * @param {string} url
 * @param {string} dest
 * @returns {Promise<void>}
 */
function download(url, dest) {
  return new Promise((resolve, reject) => {
    const request = currentUrl => {
      https
        .get(currentUrl, res => {
          if (
            res.statusCode >= 300 &&
            res.statusCode < 400 &&
            res.headers.location
          ) {
            request(res.headers.location)
            return
          }
          if (res.statusCode !== 200) {
            reject(new Error(`download failed with status ${res.statusCode}`))
            return
          }
          const out = fs.createWriteStream(dest)
          res.pipe(out)
          out.on('finish', resolve)
          out.on('error', reject)
        })
        .on('error', reject)
    }
    request(url)
  })
}

/**
 * Verify a file's SHA256 matches the expected digest string.
 * Accepts digest in "sha256:<hex>" or bare "<hex>" format.
 * @param {string} filePath
 * @param {string} expectedDigest
 * @throws {Error} When digest does not match.
 */
function verifySha256(filePath, expectedDigest) {
  const expected = expectedDigest.startsWith('sha256:')
    ? expectedDigest.slice(7)
    : expectedDigest
  const actual = createHash('sha256')
    .update(fs.readFileSync(filePath))
    .digest('hex')
  if (actual !== expected) {
    throw new Error(
      `SHA256 mismatch for ${path.basename(filePath)}: expected ${expected}, got ${actual}`,
    )
  }
}

async function main() {
  // Fetch release metadata to get the download URL and digest for this platform.
  console.log(`Fetching sfw-free release metadata`)
  const release = await fetchJson(
    'https://api.github.com/repos/SocketDev/sfw-free/releases/latest',
    { 'User-Agent': 'setup-sfw', Accept: 'application/vnd.github+json' },
  )

  const asset = release.assets?.find(a => a.name === assetName)
  if (!asset) {
    throw new Error(
      `asset "${assetName}" not found in release ${release.tag_name}`,
    )
  }
  if (!asset.digest) {
    throw new Error(`no digest for asset "${assetName}" in release ${release.tag_name}`)
  }

  const { browser_download_url: downloadUrl, digest } = asset

  // Use a stable per-job dir under the runner's temp path so the shim dir
  // survives across steps. Fall back to os.tmpdir() outside GitHub Actions.
  const baseDir = process.env['RUNNER_TEMP'] ?? os.tmpdir()
  const shimDir = path.join(baseDir, 'sfw-shim')
  fs.mkdirSync(shimDir, { recursive: true })

  const sfwBin = WIN32
    ? path.join(shimDir, 'sfw.exe')
    : path.join(shimDir, 'sfw')

  console.log(`Downloading ${assetName} from ${downloadUrl}`)
  await download(downloadUrl, sfwBin)

  console.log(`Verifying SHA256 digest`)
  verifySha256(sfwBin, digest)
  console.log(`SHA256 verified`)

  if (!WIN32) {
    fs.chmodSync(sfwBin, 0o755)
  }

  // Write a pnpm shim that forwards all args through sfw.
  // shell: WIN32 is the canonical cross-platform pattern — enables shell on
  // Windows only, where it is required to resolve .exe and PATH correctly.
  const shimScript = path.join(shimDir, 'pnpm-shim.mjs')
  const shimContent =
    [
      `// Auto-generated by .github/actions/install/setup-sfw.mjs — do not edit.`,
      `import { spawnSync } from 'node:child_process'`,
      `import process from 'node:process'`,
      `const result = spawnSync(`,
      `  ${JSON.stringify(sfwBin)},`,
      `  ['pnpm', ...process.argv.slice(2)],`,
      `  { stdio: 'inherit', shell: ${WIN32} }`,
      `)`,
      `process.exitCode = result.status ?? 1`,
    ].join('\n') + '\n'

  fs.writeFileSync(shimScript, shimContent, 'utf8')

  if (WIN32) {
    // .cmd shim so Windows PATH resolution finds "pnpm" → runs node shimScript.
    const cmdShim = path.join(shimDir, 'pnpm.cmd')
    fs.writeFileSync(cmdShim, `@node "${shimScript}" %*\r\n`, 'utf8')
  } else {
    // On POSIX, write a wrapper script named "pnpm" that calls node on the shim.
    // Avoids shebang dependency — the shell invokes node explicitly.
    const posixShim = path.join(shimDir, 'pnpm')
    fs.writeFileSync(posixShim, `node "${shimScript}" "$@"\n`, 'utf8')
    fs.chmodSync(posixShim, 0o755)
  }

  // Prepend shimDir to GITHUB_PATH so subsequent steps resolve our shim first.
  const githubPath = process.env['GITHUB_PATH']
  if (githubPath) {
    fs.appendFileSync(githubPath, `${shimDir}\n`, 'utf8')
    console.log(`Added ${shimDir} to GITHUB_PATH`)
  } else {
    // Outside of GitHub Actions — warn but don't fail.
    console.error(
      `GITHUB_PATH not set — shim installed at ${shimDir} but not added to PATH\n`,
    )
  }

  // Verify the shim files were written correctly.
  const shimFile = WIN32
    ? path.join(shimDir, 'pnpm.cmd')
    : path.join(shimDir, 'pnpm')
  if (!fs.existsSync(shimFile)) {
    throw new Error(`pnpm shim not found at ${shimFile}`)
  }

  console.log(`sfw pnpm shim ready at ${shimDir}`)
}

main().catch(e => {
  console.error(`setup-sfw failed: ${e.message}`)
  process.exitCode = 1
})
