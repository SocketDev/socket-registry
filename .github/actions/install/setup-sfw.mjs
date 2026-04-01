/**
 * @fileoverview Downloads the sfw-free binary and injects shims for all
 * supported package managers (npm, yarn, pnpm, pip, uv, cargo) into
 * GITHUB_PATH so every subsequent invocation is transparently wrapped by sfw.
 * Must run before any install step.
 *
 * How it works:
 *   1. Fetches the latest release metadata from the GitHub API to get the
 *      platform-correct download URL and its SHA256 digest.
 *   2. Downloads the sfw binary into $RUNNER_TEMP/sfw-shim/.
 *   3. Verifies the binary against the digest from the API.
 *   4. For each supported package manager, writes two files into shimDir:
 *        <name>-shim.mjs   — Node ESM script that calls: sfw <name> ...args
 *        <name>            — POSIX #!/bin/sh wrapper: node "<name>-shim.mjs" "$@"
 *        <name>.cmd        — Windows CMD wrapper:     @node "<name>-shim.mjs" %*
 *   5. Prepends shimDir to $GITHUB_PATH so all subsequent steps in the job
 *      resolve the shim instead of the real binary.
 *
 * Why two files per shim (the .mjs + the wrapper)?
 *   Node cannot be invoked directly as a shebang interpreter for .mjs files
 *   on all platforms. The wrapper (POSIX shell script or .cmd) is what PATH
 *   resolution finds when a step runs e.g. `pnpm install`. It then explicitly
 *   calls `node "<name>-shim.mjs"` which handles the actual sfw delegation.
 *   The .mjs holds the logic; the wrapper is just the PATH-visible entry point.
 *
 * Why $RUNNER_TEMP and not os.tmpdir()?
 *   $RUNNER_TEMP is a GitHub Actions-specific directory that persists for the
 *   entire job across all steps. os.tmpdir() may return a per-process temp
 *   dir that is cleaned up between steps on some runners.
 *
 * Why github.action_path in action.yml instead of a repo-relative path?
 *   When another repo references this action remotely via
 *   `uses: SocketDev/socket-registry/.github/actions/install@<sha>`, GitHub
 *   checks out the action's own files into a runner-managed temp location.
 *   ${{ github.action_path }} resolves to that location regardless of whether
 *   the caller is this repo or a remote consumer — a repo-relative path would
 *   only work locally.
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

// All package managers sfw supports.
// https://docs.socket.dev/docs/socket-firewall-free#usage
const SHIM_NAMES = ['cargo', 'npm', 'pip', 'pnpm', 'uv', 'yarn']

// Maps Node.js process.platform + process.arch → sfw GitHub release asset name.
// Asset names come from https://github.com/SocketDev/sfw-free/releases/latest.
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
 * The digest is sourced from the GitHub release asset metadata, not a
 * separately published checksums file, so it comes from the same API
 * call used to get the download URL.
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

/**
 * Write a shim pair for a single package manager into shimDir.
 *
 * The shim pair consists of:
 *
 *   <name>-shim.mjs
 *     A Node ESM script that invokes `sfw <name> ...args` via spawnSync.
 *     Not directly executable — called by the wrapper below.
 *     Uses shell: WIN32 (the canonical cross-platform pattern): enables shell
 *     on Windows only, where it is required to resolve .exe paths correctly.
 *
 *   POSIX — <name>  (no extension, chmod 755)
 *     A #!/bin/sh script that calls: node "<name>-shim.mjs" "$@"
 *     This is what PATH resolution finds when a step runs e.g. `pnpm install`.
 *     Needs a shebang so the kernel knows to invoke /bin/sh as the interpreter.
 *     We use /bin/sh rather than #!/usr/bin/env node because the wrapper is a
 *     shell script, not a Node script — node is invoked explicitly inside it.
 *
 *   Windows — <name>.cmd
 *     A CMD script that calls: @node "<name>-shim.mjs" %*
 *     Windows PATH resolution finds .cmd files automatically when you type
 *     the bare name (e.g. `pnpm`). No shebang concept on Windows.
 *
 * @param {string} name - Package manager name (e.g. "pnpm", "cargo")
 * @param {string} shimDir - Directory to write shim files into.
 * @param {string} sfwBin - Absolute path to the downloaded sfw binary.
 */
function writeShim(name, shimDir, sfwBin) {
  // The .mjs holds the actual delegation logic. It is called by the wrapper,
  // never invoked directly via PATH. The absolute sfwBin path is baked in at
  // generation time so the script has no PATH dependency of its own.
  const shimScript = path.join(shimDir, `${name}-shim.mjs`)
  const silent = process.env['SFW_SHIM_SILENT'] === 'true'
  const shimContent =
    [
      `// Auto-generated by .github/actions/install/setup-sfw.mjs — do not edit.`,
      `import { spawnSync } from 'node:child_process'`,
      `import process from 'node:process'`,
      `const result = spawnSync(`,
      `  ${JSON.stringify(sfwBin)},`,
      `  [${JSON.stringify(name)}, ${silent ? `'--silent', ` : ''}...process.argv.slice(2)],`,
      `  { stdio: 'inherit', shell: ${WIN32} }`,
      `)`,
      `process.exitCode = result.status ?? 1`,
    ].join('\n') + '\n'

  fs.writeFileSync(shimScript, shimContent, 'utf8')

  if (WIN32) {
    // Windows resolves bare command names by appending .cmd, .exe, etc. from
    // PATHEXT. Writing <name>.cmd into shimDir means `pnpm` → `pnpm.cmd`.
    fs.writeFileSync(
      path.join(shimDir, `${name}.cmd`),
      `@node "${shimScript}" %*\r\n`,
      'utf8',
    )
  } else {
    // POSIX PATH resolution finds the first executable file named exactly
    // <name> in any directory listed in $PATH. The #!/bin/sh shebang tells
    // the kernel to run /bin/sh as the interpreter for this script.
    const posixShim = path.join(shimDir, name)
    fs.writeFileSync(
      posixShim,
      `#!/bin/sh\nnode "${shimScript}" "$@"\n`,
      'utf8',
    )
    fs.chmodSync(posixShim, 0o755)
  }
}

async function main() {
  // Fetch release metadata to get the download URL and digest for this platform.
  // We use the API rather than constructing the URL directly so we also get the
  // digest field, which the raw download URL does not carry.
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
    throw new Error(
      `no digest for asset "${assetName}" in release ${release.tag_name}`,
    )
  }

  const { browser_download_url: downloadUrl, digest } = asset

  // $RUNNER_TEMP is a GitHub Actions-provided directory that persists for the
  // entire job. We use it (rather than os.tmpdir()) so the sfw binary and shim
  // files survive across all steps without needing to be re-downloaded.
  const baseDir = process.env['RUNNER_TEMP'] ?? os.tmpdir()
  const shimDir = path.join(baseDir, 'sfw-shim')
  fs.mkdirSync(shimDir, { recursive: true })

  // sfw is a native binary; the filename differs by platform.
  const sfwBin = WIN32
    ? path.join(shimDir, 'sfw.exe')
    : path.join(shimDir, 'sfw')

  console.log(`Downloading ${assetName} from ${downloadUrl}`)
  await download(downloadUrl, sfwBin)

  // Verify before marking executable — reject a corrupted or tampered binary.
  console.log(`Verifying SHA256 digest`)
  verifySha256(sfwBin, digest)
  console.log(`SHA256 verified`)

  // chmod is a no-op on Windows but required on POSIX for the binary to exec.
  if (!WIN32) {
    fs.chmodSync(sfwBin, 0o755)
  }

  // Write a shim pair (wrapper + .mjs logic) for every supported package manager.
  for (const name of SHIM_NAMES) {
    writeShim(name, shimDir, sfwBin)
  }
  console.log(`sfw shims written for: ${SHIM_NAMES.join(', ')}`)

  // Appending shimDir to $GITHUB_PATH makes it available in PATH for all
  // subsequent steps in this job. The file is read by the Actions runner after
  // each step completes, so it takes effect from the very next step onward —
  // which is why this script must run before any install step.
  const githubPath = process.env['GITHUB_PATH']
  if (githubPath) {
    fs.appendFileSync(githubPath, `${shimDir}\n`, 'utf8')
    console.log(`Added ${shimDir} to GITHUB_PATH`)
  } else {
    // Outside of GitHub Actions — warn but don't fail so the script can be
    // tested locally (shims will be written but PATH won't be updated).
    console.error(
      `GITHUB_PATH not set — shims installed at ${shimDir} but not added to PATH`,
    )
  }

  console.log(`sfw shims ready at ${shimDir}`)
}

main().catch(e => {
  console.error(`setup-sfw failed: ${e.message}`)
  process.exitCode = 1
})
