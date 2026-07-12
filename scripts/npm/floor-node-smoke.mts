#!/usr/bin/env node
/**
 * @file Prove every npm override runs on the FLOOR Node its engines declare.
 *   All packages/npm overrides ship `engines.node: >=24`, but regular CI runs
 *   a newer current-line Node — nothing executes the floor, so an override
 *   that quietly uses newer-than-floor syntax/APIs stays green here and only
 *   breaks inside a consumer pinned to the floor. This gate side-installs the
 *   EXACT floor release (pinned version + sha256, verified before extraction —
 *   a mismatched download hard-fails) and dynamic-imports every override's
 *   node entry under that binary.
 *   The floor binary is a side install: it never touches PATH — the harness
 *   keeps running on the repo's own Node and spawns the floor binary
 *   explicitly, so the two runtimes can't be confused.
 *   Usage: node scripts/npm/floor-node-smoke.mts
 *   Env: FLOOR_NODE_DIR overrides the install dir (default: RUNNER_TEMP,
 *   falling back to os.tmpdir()).
 */
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
} from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { httpDownload } from '@socketsecurity/lib-stable/http-request/download'
import { getDefaultLogger } from '@socketsecurity/lib-stable/logger/default'
import { spawnSync } from '@socketsecurity/lib-stable/process/spawn/child'

const logger = getDefaultLogger()

// The floor is the low edge of packages/npm/*'s `engines.node: >=24` range.
// Bump BOTH the version and every sha256 together when the engines floor
// moves — hashes come from https://nodejs.org/dist/v<version>/SHASUMS256.txt.
// floor-node-pin-matches-engines (check --all) enforces the version half of
// that lock-step: it fails when any override's engines floor drifts from
// this pin.
export const FLOOR_NODE_VERSION = '24.0.0'
const FLOOR_NODE_PLATFORMS: Record<string, { asset: string; sha256: string }> =
  {
    'darwin-arm64': {
      asset: `node-v${FLOOR_NODE_VERSION}-darwin-arm64.tar.gz`,
      sha256:
        '194e2f3dd3ec8c2adcaa713ed40f44c5ca38467880e160974ceac1659be60121',
    },
    'darwin-x64': {
      asset: `node-v${FLOOR_NODE_VERSION}-darwin-x64.tar.gz`,
      sha256:
        'f716b3ce14a7e37a6cbf97c9de10d444d7da07ef833cd8da81dd944d111e6a4a',
    },
    'linux-x64': {
      asset: `node-v${FLOOR_NODE_VERSION}-linux-x64.tar.xz`,
      sha256:
        '59b8af617dccd7f9f68cc8451b2aee1e86d6bd5cb92cd51dd6216a31b707efd7',
    },
    'win-x64': {
      asset: `node-v${FLOOR_NODE_VERSION}-win-x64.zip`,
      sha256:
        '3d0fff80c87bb9a8d7f49f2f27832aa34a1477d137af46f5b14df5498be81304',
    },
  }

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
)
const npmPackagesPath = path.join(repoRoot, 'packages/npm')

/**
 * Download + verify + extract the floor Node, returning its binary path.
 * `httpDownload` streams to a temp sibling, checks the pinned sha256, and
 * atomic-renames on success — a tampered or truncated download never
 * materializes at the archive path, let alone extracts.
 */
async function ensureFloorNode(): Promise<string> {
  const platKey = `${process.platform}-${process.arch}`
  const pin = FLOOR_NODE_PLATFORMS[platKey]
  if (!pin) {
    throw new Error(
      `no floor-node pin for ${platKey} — add its asset + sha256 (from ` +
        `https://nodejs.org/dist/v${FLOOR_NODE_VERSION}/SHASUMS256.txt) to FLOOR_NODE_PLATFORMS`,
    )
  }
  const baseDir =
    process.env['FLOOR_NODE_DIR'] || process.env['RUNNER_TEMP'] || os.tmpdir()
  // Strip the archive suffix (.tar.gz / .tar.xz / .zip) to get the top-level
  // directory name the tarball extracts to (node-v<ver>-<os>-<arch>).
  const extractDir = path.join(
    baseDir,
    pin.asset.replace(/\.(tar\.(gz|xz)|zip)$/, ''),
  )
  const binPath =
    process.platform === 'win32'
      ? path.join(extractDir, 'node.exe')
      : path.join(extractDir, 'bin/node')
  if (existsSync(binPath)) {
    return binPath
  }
  const url = `https://nodejs.org/dist/v${FLOOR_NODE_VERSION}/${pin.asset}`
  logger.log(`downloading floor node ${FLOOR_NODE_VERSION} (${pin.asset})`)
  mkdirSync(baseDir, { recursive: true })
  const archivePath = path.join(baseDir, pin.asset)
  await httpDownload(url, archivePath, { sha256: pin.sha256 })
  // `tar -xf` auto-detects gz/xz; bsdtar (macOS + Windows runners) also
  // extracts zip through the same flag.
  const tar = spawnSync('tar', ['-xf', archivePath, '-C', baseDir], {
    stdio: 'inherit',
  })
  rmSync(archivePath, { force: true })
  if (tar.status !== 0 || !existsSync(binPath)) {
    rmSync(extractDir, { force: true, recursive: true })
    throw new Error(`floor node extract failed (${pin.asset})`)
  }
  return binPath
}

/**
 * Resolve a package's node-runtime entry from its `exports` map (the
 * overrides ship no `main`). Condition preference mirrors Node's own
 * resolution for a `node` consumer; `types` never matches by construction.
 */
function resolveNodeEntry(exp: unknown): string | undefined {
  if (typeof exp === 'string') {
    return exp
  }
  if (!exp || typeof exp !== 'object') {
    return undefined
  }
  const conditions = exp as Record<string, unknown>
  const conditionOrder = ['node', 'import', 'require', 'default']
  for (let i = 0, { length } = conditionOrder; i < length; i += 1) {
    const key = conditionOrder[i]!
    if (key in conditions) {
      const resolved = resolveNodeEntry(conditions[key])
      if (resolved) {
        return resolved
      }
    }
  }
  return undefined
}

async function main(): Promise<void> {
  const floorNode = await ensureFloorNode()
  const version = spawnSync(floorNode, ['--version'], { encoding: 'utf8' })
  logger.log(
    `floor node ready: ${String(version.stdout).trim()} at ${floorNode}`,
  )

  const failures: string[] = []
  let imported = 0
  let skipped = 0
  const dirents = readdirSync(npmPackagesPath, { withFileTypes: true })
  for (let i = 0, { length } = dirents; i < length; i += 1) {
    const dirent = dirents[i]!
    if (!dirent.isDirectory()) {
      continue
    }
    const pkgDir = path.join(npmPackagesPath, dirent.name)
    const pkgJsonPath = path.join(pkgDir, 'package.json')
    if (!existsSync(pkgJsonPath)) {
      continue
    }
    const pkgJson = JSON.parse(readFileSync(pkgJsonPath, 'utf8'))
    const entryRel = pkgJson.exports
      ? resolveNodeEntry(pkgJson.exports['.'] ?? pkgJson.exports)
      : pkgJson.main
    if (!entryRel) {
      skipped += 1
      logger.log(
        `skip ${dirent.name}: no node entry (bin-only or asset package)`,
      )
      continue
    }
    const entryUrl = pathToFileURL(path.join(pkgDir, entryRel)).href
    // Dynamic import loads every entry kind a floor-pinned ESM consumer can
    // reach: .cjs, .js/ESM, and .json (which requires the import attribute
    // on every Node — `date` and `es-iterator-helpers` ship JSON entries).
    const run = spawnSync(
      floorNode,
      [
        '--input-type=module',
        '-e',
        "const s = process.argv[1]; await (s.endsWith('.json') ? import(s, { with: { type: 'json' } }) : import(s))",
        entryUrl,
      ],
      { encoding: 'utf8' },
    )
    if (run.status === 0) {
      imported += 1
    } else {
      failures.push(
        `${dirent.name}: ${String(run.stderr).trim().split('\n')[0]}`,
      )
    }
  }

  logger.log(
    `floor-node smoke: ${imported} imported, ${skipped} skipped, ${failures.length} failed ` +
      `(node ${FLOOR_NODE_VERSION})`,
  )
  if (failures.length > 0) {
    for (let i = 0, { length } = failures; i < length; i += 1) {
      logger.error(`FAIL ${failures[i]}`)
    }
    process.exitCode = 1
  }
}

// Entrypoint-guarded: floor-node-pin-matches-engines (check --all) imports
// FLOOR_NODE_VERSION from this module, which must not trigger a download.
if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e: unknown) => {
    logger.error(e)
    process.exitCode = 1
  })
}
