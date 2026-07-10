// vitest spec for check-package-manager-pins-are-synced. The exported pure
// functions (derivePins, majorBoundedRange, applyPins, formatDrift,
// classifyPinDrift, extractPinVersion, compareSemver, isBehindSource,
// readToolVersions) and the exported findPinDrift are exercised against temp
// fixture dirs so no real repo is needed. Corepack is disabled fleet-wide:
// there is NO packageManager field — pnpm's native devEngines.packageManager
// (a major-bounded range + onFail:error) carries the version. Importing the
// check is side-effect-free (main() is entrypoint-guarded).

import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { describe, test } from 'vitest'

import { findPinDrift } from '../../../scripts/fleet/check/package-manager-pins-are-synced.mts'
import {
  applyPins,
  classifyPinDrift,
  compareSemver,
  derivePins,
  extractPinVersion,
  formatDrift,
  isBehindSource,
  majorBoundedRange,
  readToolVersions,
} from '../../../scripts/fleet/sync-package-manager-pins.mts'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeFixtureRoot(opts: {
  pnpmVersion: string
  npmVersion: string
  // pnpmFloor is the `>=` floor written to package.json `engines.pnpm`; the
  // fixture's `devEngines.packageManager.version` is that floor's major-bounded
  // range. When absent the floor is `pnpmVersion`.
  pnpmFloor?: string | undefined
  // Inject a LEGACY `packageManager` field to exercise its removal.
  pkgPackageManager?: string | undefined
  pkgEnginesPnpm?: string | undefined
  pkgEnginesNpm?: string | undefined
}): string {
  const root = mkdtempSync(path.join(os.tmpdir(), 'pm-pins-'))
  mkdirSync(path.join(root, 'scripts/fleet/setup'), { recursive: true })

  const externalTools = {
    tools: {
      pnpm: { version: opts.pnpmVersion },
      npm: { version: opts.npmVersion },
    },
  }
  writeFileSync(
    path.join(root, 'scripts/fleet/setup/external-tools.json'),
    JSON.stringify(externalTools),
    'utf8',
  )

  const floor = opts.pnpmFloor ?? opts.pnpmVersion
  const pkg: Record<string, unknown> = {
    name: 'test-pkg',
    devEngines: {
      packageManager: {
        name: 'pnpm',
        version: majorBoundedRange(floor),
        onFail: 'error',
      },
    },
    engines: {
      pnpm: opts.pkgEnginesPnpm ?? `>=${floor}`,
      npm: opts.pkgEnginesNpm ?? `>=${opts.npmVersion}`,
    },
  }
  if (opts.pkgPackageManager !== undefined) {
    pkg['packageManager'] = opts.pkgPackageManager
  }
  writeFileSync(path.join(root, 'package.json'), JSON.stringify(pkg), 'utf8')

  return root
}

// ---------------------------------------------------------------------------
// derivePins
// ---------------------------------------------------------------------------

describe('majorBoundedRange', () => {
  test('bounds to the version major: 10.0.0 → >=10.0.0 <11.0.0', () => {
    assert.equal(majorBoundedRange('10.0.0'), '>=10.0.0 <11.0.0')
  })
  test('reads the major from any patch: 11.0.5 → >=11.0.0 <12.0.0', () => {
    assert.equal(majorBoundedRange('11.0.5'), '>=11.0.0 <12.0.0')
  })
})

describe('derivePins', () => {
  test('devEngines.packageManager is a major-bounded range; engines is the floor', () => {
    const pins = derivePins('10.0.0', '20.0.0')
    assert.equal(pins.devEnginesPnpm.name, 'pnpm')
    assert.equal(pins.devEnginesPnpm.version, '>=10.0.0 <11.0.0')
    assert.equal(pins.devEnginesPnpm.onFail, 'error')
    assert.equal(pins.enginesPnpm, '>=10.0.0')
    assert.equal(pins.enginesNpm, '>=20.0.0')
  })

  test('uses the pnpmFloor major for the range + the floor for engines.pnpm', () => {
    const pins = derivePins('11.9.0', '11.17.0', { pnpmFloor: '11.0.5' })
    assert.equal(pins.devEnginesPnpm.version, '>=11.0.0 <12.0.0')
    assert.equal(pins.enginesPnpm, '>=11.0.5')
    assert.equal(pins.enginesNpm, '>=11.17.0')
  })

  test('falls back to pnpmVersion for the floor when pnpmFloor is absent', () => {
    const pins = derivePins('11.9.0', '11.17.0')
    assert.equal(pins.devEnginesPnpm.version, '>=11.0.0 <12.0.0')
    assert.equal(pins.enginesPnpm, '>=11.9.0')
  })

  test('onFail is error — no surprise pnpm downloads (fleet provisions it)', () => {
    assert.equal(derivePins('11.9.0', '11.17.0').devEnginesPnpm.onFail, 'error')
  })
})

// ---------------------------------------------------------------------------
// applyPins
// ---------------------------------------------------------------------------

describe('applyPins', () => {
  test('returns empty drift when package.json is already in sync', () => {
    const pkg = {
      devEngines: {
        packageManager: {
          name: 'pnpm',
          version: '>=10.0.0 <11.0.0',
          onFail: 'error',
        },
      },
      engines: { pnpm: '>=10.0.0', npm: '>=20.0.0' },
    }
    const drift = applyPins(pkg, derivePins('10.0.0', '20.0.0'))
    assert.deepEqual(drift, [])
  })

  test('deletes a legacy packageManager field (corepack disabled)', () => {
    const pkg: Record<string, unknown> = {
      packageManager: 'pnpm@>=10.0.0',
      devEngines: {
        packageManager: {
          name: 'pnpm',
          version: '>=10.0.0 <11.0.0',
          onFail: 'error',
        },
      },
      engines: { pnpm: '>=10.0.0', npm: '>=20.0.0' },
    }
    const drift = applyPins(pkg, derivePins('10.0.0', '20.0.0'))
    assert.equal(drift.length, 1)
    assert.equal(drift[0]!.field, 'packageManager')
    assert.equal(pkg['packageManager'], undefined)
  })

  test('adds devEngines.packageManager when missing + mutates pkg', () => {
    const pkg: Record<string, unknown> = {
      engines: { pnpm: '>=10.0.0', npm: '>=20.0.0' },
    }
    const drift = applyPins(pkg, derivePins('10.0.0', '20.0.0'))
    assert.equal(drift.length, 1)
    assert.equal(drift[0]!.field, 'devEngines.packageManager')
    const de = (pkg['devEngines'] as Record<string, Record<string, unknown>>)[
      'packageManager'
    ]!
    assert.equal(de['name'], 'pnpm')
    assert.equal(de['version'], '>=10.0.0 <11.0.0')
    assert.equal(de['onFail'], 'error')
  })

  test('drift entries for each out-of-sync field (legacy pm + devEngines + engines)', () => {
    const pkg: Record<string, unknown> = {
      packageManager: 'pnpm@9.0.0',
      engines: { pnpm: '>=9.0.0', npm: '>=19.0.0' },
    }
    const drift = applyPins(pkg, derivePins('10.0.0', '20.0.0'))
    // packageManager removal + devEngines add + engines.pnpm + engines.npm.
    assert.equal(drift.length, 4)
    assert.ok(drift.some(d => d.field === 'packageManager'))
    assert.ok(drift.some(d => d.field === 'devEngines.packageManager'))
    assert.ok(drift.some(d => d.field === 'engines.pnpm'))
  })

  test('handles a missing engines object', () => {
    const pkg: Record<string, unknown> = {
      devEngines: {
        packageManager: {
          name: 'pnpm',
          version: '>=10.0.0 <11.0.0',
          onFail: 'error',
        },
      },
    }
    const drift = applyPins(pkg, derivePins('10.0.0', '20.0.0'))
    // engines.pnpm and engines.npm are both missing → both drift.
    assert.equal(drift.length, 2)
  })

  test('no drift when devEngines + engines floor already match', () => {
    const pkg = {
      devEngines: {
        packageManager: {
          name: 'pnpm',
          version: '>=11.0.0 <12.0.0',
          onFail: 'error',
        },
      },
      engines: { pnpm: '>=11.0.5', npm: '>=11.17.0' },
    }
    const drift = applyPins(
      pkg,
      derivePins('11.9.0', '11.17.0', { pnpmFloor: '11.0.5' }),
    )
    assert.deepEqual(drift, [])
  })

  test('drifted when enginesPnpm is the exact version but floor is expected', () => {
    const pkg: Record<string, unknown> = {
      devEngines: {
        packageManager: {
          name: 'pnpm',
          version: '>=11.0.0 <12.0.0',
          onFail: 'error',
        },
      },
      engines: { pnpm: '>=11.9.0', npm: '>=11.17.0' },
    }
    const drift = applyPins(
      pkg,
      derivePins('11.9.0', '11.17.0', { pnpmFloor: '11.0.5' }),
    )
    assert.equal(drift.length, 1)
    assert.equal(drift[0]!.field, 'engines.pnpm')
    assert.equal(drift[0]!.actual, '>=11.9.0')
    assert.equal(drift[0]!.expected, '>=11.0.5')
  })
})

// ---------------------------------------------------------------------------
// formatDrift
// ---------------------------------------------------------------------------

describe('formatDrift', () => {
  test('renders field: actual → expected', () => {
    assert.equal(
      formatDrift({
        field: 'packageManager',
        actual: 'pnpm@9.0.0',
        expected: 'pnpm@>=10.0.0',
      }),
      'packageManager: pnpm@9.0.0 → pnpm@>=10.0.0',
    )
  })
})

// ---------------------------------------------------------------------------
// extractPinVersion
// ---------------------------------------------------------------------------

describe('extractPinVersion', () => {
  test('extracts from pnpm@X.Y.Z', () => {
    assert.equal(extractPinVersion('pnpm@10.5.1'), '10.5.1')
  })
  test('extracts from pnpm@>=X.Y.Z forgiving pin', () => {
    assert.equal(extractPinVersion('pnpm@>=10.5.1'), '10.5.1')
  })
  test('extracts from >=X.Y.Z range', () => {
    assert.equal(extractPinVersion('>=10.5.1'), '10.5.1')
  })
  test('extracts a bare X.Y.Z', () => {
    assert.equal(extractPinVersion('10.5.1'), '10.5.1')
  })
  test('returns undefined for "undefined" string (absent field)', () => {
    assert.equal(extractPinVersion('undefined'), undefined)
  })
})

// ---------------------------------------------------------------------------
// compareSemver
// ---------------------------------------------------------------------------

describe('compareSemver', () => {
  test('equal versions return 0', () => {
    assert.equal(compareSemver('10.0.0', '10.0.0'), 0)
  })
  test('lower < higher returns -1', () => {
    assert.equal(compareSemver('9.0.0', '10.0.0'), -1)
  })
  test('higher > lower returns 1', () => {
    assert.equal(compareSemver('10.0.0', '9.0.0'), 1)
  })
  test('patch comparison', () => {
    assert.equal(compareSemver('10.0.1', '10.0.2'), -1)
    assert.equal(compareSemver('10.0.2', '10.0.1'), 1)
  })
})

// ---------------------------------------------------------------------------
// isBehindSource
// ---------------------------------------------------------------------------

describe('isBehindSource', () => {
  // Engines floors are version-compared: behind (lower) warns, ahead/equal
  // does not.
  test('engines floor lower than expected is behind (true)', () => {
    assert.equal(
      isBehindSource({
        field: 'engines.npm',
        actual: '>=9.0.0',
        expected: '>=10.0.0',
      }),
      true,
    )
  })
  test('engines floor higher than expected is not behind (false)', () => {
    assert.equal(
      isBehindSource({
        field: 'engines.npm',
        actual: '>=11.0.0',
        expected: '>=10.0.0',
      }),
      false,
    )
  })
  test('engines floor equal to expected is not behind (false)', () => {
    assert.equal(
      isBehindSource({
        field: 'engines.pnpm',
        actual: '>=10.0.0',
        expected: '>=10.0.0',
      }),
      false,
    )
  })

  // packageManager removal (corepack disabled) and any devEngines.packageManager
  // reshape never hard-fail an install, so both are always benign.
  test('packageManager drift (removal) is always benign (true)', () => {
    assert.equal(
      isBehindSource({
        field: 'packageManager',
        actual: 'pnpm@11.8.0',
        expected: '(removed — corepack disabled)',
      }),
      true,
    )
  })
  test('devEngines.packageManager reshape is always benign (true)', () => {
    assert.equal(
      isBehindSource({
        field: 'devEngines.packageManager',
        actual: '{"name":"pnpm","version":">=10.0.0 <11.0.0","onFail":"error"}',
        expected:
          '{"name":"pnpm","version":">=11.0.0 <12.0.0","onFail":"error"}',
      }),
      true,
    )
  })
})

// ---------------------------------------------------------------------------
// classifyPinDrift
// ---------------------------------------------------------------------------

describe('classifyPinDrift', () => {
  test('synced when drift is empty', () => {
    assert.equal(classifyPinDrift([]), 'synced')
  })

  test('behind when every drift entry is benign', () => {
    const drift = [
      {
        field: 'devEngines.packageManager',
        actual: '{"name":"pnpm","version":">=10.0.0 <11.0.0","onFail":"error"}',
        expected:
          '{"name":"pnpm","version":">=11.0.0 <12.0.0","onFail":"error"}',
      },
      { field: 'engines.npm', actual: '>=19.0.0', expected: '>=20.0.0' },
    ]
    assert.equal(classifyPinDrift(drift), 'behind')
  })

  test('drifted when an engines floor is ahead of the source', () => {
    const drift = [
      { field: 'engines.npm', actual: '>=21.0.0', expected: '>=20.0.0' },
    ]
    assert.equal(classifyPinDrift(drift), 'drifted')
  })

  test('drifted when mixed (packageManager removal benign, engines ahead)', () => {
    const drift = [
      {
        field: 'packageManager',
        actual: 'pnpm@9.0.0',
        expected: '(removed — corepack disabled)',
      },
      { field: 'engines.npm', actual: '>=21.0.0', expected: '>=20.0.0' },
    ]
    assert.equal(classifyPinDrift(drift), 'drifted')
  })
})

// ---------------------------------------------------------------------------
// readToolVersions
// ---------------------------------------------------------------------------

describe('readToolVersions', () => {
  test('extracts pnpmVersion + npmVersion from a well-formed object', () => {
    const ext = {
      tools: {
        pnpm: { version: '10.0.0' },
        npm: { version: '20.0.0' },
      },
    }
    const { pnpmVersion, npmVersion } = readToolVersions(ext)
    assert.equal(pnpmVersion, '10.0.0')
    assert.equal(npmVersion, '20.0.0')
  })

  test('throws a descriptive error when pnpm version is absent', () => {
    const ext = { tools: { npm: { version: '20.0.0' } } }
    assert.throws(() => readToolVersions(ext), /tools\.pnpm\.version/)
  })

  test('throws when tools key is missing entirely', () => {
    assert.throws(() => readToolVersions({}), /tools\.pnpm\.version/)
  })
})

// ---------------------------------------------------------------------------
// findPinDrift (integration — reads temp fixture files)
// ---------------------------------------------------------------------------

describe('findPinDrift', () => {
  test('returns empty drift when package.json pins match external-tools.json', () => {
    const root = makeFixtureRoot({
      pnpmVersion: '10.0.0',
      npmVersion: '20.0.0',
    })
    const drift = findPinDrift(root)
    assert.deepEqual(drift, [])
  })

  test('flags + removes a legacy packageManager field (corepack disabled, benign)', () => {
    const root = makeFixtureRoot({
      pnpmVersion: '10.0.0',
      npmVersion: '20.0.0',
      pkgPackageManager: 'pnpm@11.0.0',
    })
    const drift = findPinDrift(root)
    const pmDrift = drift.find(d => d.field === 'packageManager')
    assert.ok(pmDrift)
    assert.equal(pmDrift.actual, 'pnpm@11.0.0')
    // The legacy field is removed, not reshaped; removal classifies as benign.
    assert.equal(classifyPinDrift([pmDrift]), 'behind')
  })

  test('returns drift when package.json trails the source (behind scenario)', () => {
    const root = makeFixtureRoot({
      pnpmVersion: '10.0.0',
      npmVersion: '20.0.0',
      pkgPackageManager: 'pnpm@9.0.0',
      pkgEnginesPnpm: '>=9.0.0',
    })
    const drift = findPinDrift(root)
    // at least packageManager and engines.pnpm should differ
    assert.ok(drift.length >= 1)
    const cls = classifyPinDrift(drift)
    assert.equal(cls, 'behind')
  })

  test('classifies correctly as drifted (engines ahead of source)', () => {
    const root = makeFixtureRoot({
      pnpmVersion: '10.0.0',
      npmVersion: '20.0.0',
      pkgEnginesNpm: '>=21.0.0',
    })
    const drift = findPinDrift(root)
    assert.ok(drift.length >= 1)
    assert.equal(classifyPinDrift(drift), 'drifted')
  })

  test('no drift when packageManager + enginesPnpm are both the floor', () => {
    // Fixture: floor 11.0.5 written to both packageManager (pnpm@>=11.0.5) and
    // engines.pnpm (>=11.0.5). findPinDrift reads the floor from engines.pnpm
    // and calls derivePins with pnpmFloor='11.0.5', so the expected pins match
    // the stored values → no drift.
    const root = makeFixtureRoot({
      pnpmVersion: '11.9.0',
      npmVersion: '11.17.0',
      pnpmFloor: '11.0.5',
    })
    const drift = findPinDrift(root)
    assert.deepEqual(drift, [])
  })

  test('enginesPnpm floor lower than pnpmVersion is not drifted (behind-check)', () => {
    // When engines.pnpm floor (11.0.5) < pnpmVersion (11.9.0), the floor is
    // intentionally lower than the exact version, not stale — self-consistent.
    const root = makeFixtureRoot({
      pnpmVersion: '11.9.0',
      npmVersion: '11.17.0',
      pnpmFloor: '11.0.5',
    })
    const drift = findPinDrift(root)
    assert.deepEqual(drift, [])
  })
})
