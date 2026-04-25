/**
 * @fileoverview Downloads, sha256-verifies, and extracts a release asset.
 *
 * Replaces the curl + sha256sum/shasum + tar/unzip dance repeated
 * across pnpm/sfw/zizmor install steps. Built-in `fetch` follows
 * redirects automatically (github.com → objects.githubusercontent.com),
 * `node:crypto.createHash` computes sha256 in-process, and tar/unzip
 * shell out (already preinstalled on every supported runner image).
 *
 * Usage:
 *   node .github/actions/lib/install-tool.mjs <url> <expected-sha256> <dest-dir> [<bin-name>]
 *
 * Behavior:
 *   - Streams the asset to <dest-dir>/<basename(url)>.
 *   - Aborts and removes the file if sha256 mismatches.
 *   - Extracts .tar.gz/.tgz with tar, .zip with unzip (POSIX) or
 *     Expand-Archive (Windows). Removes the archive after extracting.
 *   - For non-archive assets (bare binaries like sfw): the asset IS
 *     the binary — chmod +x it and rename to <bin-name> if provided.
 *
 * Exit codes:
 *   0  success
 *   1  download or extraction failed
 *   2  sha256 mismatch (stderr names expected vs actual + the path)
 */

import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { chmodSync, mkdirSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const [, , url, expectedSha256, destDir, binName] = process.argv

if (!url || !expectedSha256 || !destDir) {
  console.error('× usage: install-tool.mjs <url> <expected-sha256> <dest-dir> [<bin-name>]')
  process.exit(1)
}

mkdirSync(destDir, { recursive: true })

const assetName = path.basename(new URL(url).pathname)
const archivePath = path.join(destDir, assetName)

const headers = { __proto__: null }
// GitHub release assets in private repos require auth. When
// GITHUB_TOKEN is in env (every Actions run sets it), forward it as
// a bearer header so the same call site works for both public and
// private release-asset URLs.
if (process.env.GITHUB_TOKEN) {
  headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`
}

const res = await fetch(url, { redirect: 'follow', headers })
if (!res.ok) {
  console.error(`× download failed: HTTP ${res.status} ${res.statusText} for ${url}`)
  process.exit(1)
}

const bytes = new Uint8Array(await res.arrayBuffer())
const actualSha256 = createHash('sha256').update(bytes).digest('hex')

if (actualSha256 !== expectedSha256) {
  console.error(`× sha256 mismatch for ${assetName}`)
  console.error(`  Expected: ${expectedSha256}`)
  console.error(`  Actual:   ${actualSha256}`)
  console.error(`  URL:      ${url}`)
  process.exit(2)
}

writeFileSync(archivePath, bytes)

const lower = assetName.toLowerCase()
let extractCmd
let extractArgs
if (lower.endsWith('.tar.gz') || lower.endsWith('.tgz')) {
  extractCmd = 'tar'
  extractArgs = ['xzf', archivePath, '-C', destDir]
} else if (lower.endsWith('.zip')) {
  if (process.platform === 'win32') {
    extractCmd = 'powershell'
    extractArgs = [
      '-NoProfile',
      '-Command',
      `Expand-Archive -Path '${archivePath}' -DestinationPath '${destDir}' -Force`,
    ]
  } else {
    extractCmd = 'unzip'
    extractArgs = ['-qo', archivePath, '-d', destDir]
  }
}

if (extractCmd) {
  const r = spawnSync(extractCmd, extractArgs, { stdio: 'inherit' })
  if (r.status !== 0) {
    console.error(`× extraction failed: ${extractCmd} exited ${r.status}`)
    process.exit(1)
  }
  rmSync(archivePath, { force: true })
} else if (binName) {
  // Bare-binary asset (no archive). Rename to bin-name and chmod.
  const finalPath = path.join(destDir, binName)
  renameSync(archivePath, finalPath)
  chmodSync(finalPath, 0o755)
} else {
  chmodSync(archivePath, 0o755)
}
