#!/usr/bin/env node
/**
 * @file The floor-node smoke gate tests the Node version the overrides
 *   actually declare. The gate side-installs FLOOR_NODE_VERSION and imports
 *   every packages/npm/* entry under it — its whole premise is that the pin
 *   IS the low edge of every override's `engines.node` range. That
 *   lock-step used to be a comment ("bump BOTH together"); this law
 *   enforces the version half: every override must declare `engines.node`,
 *   and each range's minimum satisfying version must equal the pin. An
 *   engines bump without a pin bump (or vice versa) would otherwise leave
 *   the gate green while proving the WRONG floor — the exact silent drift
 *   it exists to prevent. (The sha256 half of the lock-step is enforced at
 *   runtime: httpDownload hard-fails on a hash mismatch.)
 *   Usage: node scripts/repo/check/floor-node-pin-matches-engines.mts.
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
// oxlint-disable-next-line socket/prefer-stable-external-semver -- @socketsecurity/lib-stable has no ./external/semver export at the pinned version; semver is a devDependency (scripts/tests only, not bundled).
import semver from 'semver'

import { getDefaultLogger } from '@socketsecurity/lib-stable/logger/default'

import { FLOOR_NODE_VERSION } from '../../npm/floor-node-smoke.mts'

const logger = getDefaultLogger()

export interface OverrideEngines {
  name: string
  enginesNode: string | undefined
}

/**
 * Classify each override's declared Node floor against the smoke gate's
 * pin. Pure: directory reading happens in the caller so this stays
 * unit-testable on synthetic fixtures.
 */
export function findFloorDrift(
  overrides: OverrideEngines[],
  floorVersion: string,
): string[] {
  const findings: string[] = []
  for (let i = 0, { length } = overrides; i < length; i += 1) {
    const { enginesNode, name } = overrides[i]!
    if (!enginesNode) {
      findings.push(
        `${name}: no engines.node — the floor gate's premise (every ` +
          'override declares its floor) does not hold for it',
      )
      continue
    }
    let min: semver.SemVer | undefined
    try {
      // semver throws on a malformed range instead of returning null.
      min = semver.minVersion(enginesNode, { loose: true }) ?? undefined
    } catch {
      min = undefined
    }
    if (!min) {
      findings.push(
        `${name}: engines.node ${JSON.stringify(enginesNode)} has no ` +
          'resolvable minimum version',
      )
      continue
    }
    if (min.version !== floorVersion) {
      findings.push(
        `${name}: engines.node ${JSON.stringify(enginesNode)} floors at ` +
          `${min.version}, but the smoke gate proves ${floorVersion}`,
      )
    }
  }
  return findings
}

function collectOverrideEngines(npmPackagesPath: string): OverrideEngines[] {
  const out: OverrideEngines[] = []
  const dirents = readdirSync(npmPackagesPath, { withFileTypes: true })
  for (let i = 0, { length } = dirents; i < length; i += 1) {
    const dirent = dirents[i]!
    if (!dirent.isDirectory()) {
      continue
    }
    const pkgJsonPath = path.join(npmPackagesPath, dirent.name, 'package.json')
    if (!existsSync(pkgJsonPath)) {
      continue
    }
    const pkgJson = JSON.parse(readFileSync(pkgJsonPath, 'utf8')) as {
      engines?: { node?: string | undefined } | undefined
    }
    out.push({ name: dirent.name, enginesNode: pkgJson.engines?.node })
  }
  return out
}

async function main(): Promise<number> {
  const repoRoot = path.resolve(import.meta.dirname, '../../..')
  const overrides = collectOverrideEngines(path.join(repoRoot, 'packages/npm'))
  const findings = findFloorDrift(overrides, FLOOR_NODE_VERSION)
  if (findings.length) {
    logger.fail(
      [
        `${findings.length} override(s) out of lock-step with the floor-node pin (${FLOOR_NODE_VERSION}):`,
        ...findings.map(f => `  ${f}`),
        'Fix: move engines.node and FLOOR_NODE_VERSION together —',
        '  scripts/npm/floor-node-smoke.mts (bump the pin + every sha256 from',
        '  https://nodejs.org/dist/v<version>/SHASUMS256.txt), or correct the',
        '  drifted engines range.',
      ].join('\n'),
    )
    process.exitCode = 1
    return 1
  }
  logger.success(
    `all ${overrides.length} overrides floor at ${FLOOR_NODE_VERSION} — the smoke gate proves the declared floor`,
  )
  return 0
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  void main()
}
