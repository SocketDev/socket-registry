// vitest specs for scripts/fleet/lib/doctor/lockfile-catalog-gap.mts

import assert from 'node:assert/strict'

import { describe, test } from 'vitest'

import {
  diagnoseLockfileCatalogDrift,
  parseLockfileCatalogs,
  unquoteScalar,
} from '../../../scripts/fleet/lib/doctor/lockfile-catalog-gap.mts'

// ── unquoteScalar ────────────────────────────────────────────────────────────

describe('unquoteScalar', () => {
  test('strips single + double quotes, leaves bare values', () => {
    assert.equal(unquoteScalar("'0.34.49'"), '0.34.49')
    assert.equal(unquoteScalar('"1.2.3"'), '1.2.3')
    assert.equal(unquoteScalar('  4.5.6  '), '4.5.6')
    assert.equal(unquoteScalar("'@scope/pkg'"), '@scope/pkg')
  })
})

// ── parseLockfileCatalogs ────────────────────────────────────────────────────

const LOCK = [
  'lockfileVersion: 9.0',
  '',
  'catalogs:',
  '  default:',
  "    '@sinclair/typebox':",
  '      specifier: 0.34.49',
  '      version: 0.34.49',
  '    rolldown:',
  '      specifier: 1.1.3',
  '      version: 1.1.3',
  '  react17:',
  '    react:',
  '      specifier: 17.0.2',
  '      version: 17.0.2',
  '',
  'importers:',
  '  .:',
  '    dependencies: {}',
  '',
].join('\n')

describe('parseLockfileCatalogs', () => {
  test('parses default + named catalogs with quoted + bare dep keys', () => {
    const cats = parseLockfileCatalogs(LOCK)
    // Spread to a plain object — the engine returns null-proto objects (fleet
    // convention), which node's strict deepEqual distinguishes from `{}`.
    assert.deepEqual(
      { ...cats['default'] },
      { '@sinclair/typebox': '0.34.49', rolldown: '1.1.3' },
    )
    assert.deepEqual({ ...cats['react17'] }, { react: '17.0.2' })
  })

  test('stops at the next top-level key (importers:)', () => {
    const cats = parseLockfileCatalogs(LOCK)
    // `importers` must NOT leak in as a catalog name.
    assert.equal('importers' in cats, false)
  })

  test('no catalogs block → empty object', () => {
    assert.deepEqual({ ...parseLockfileCatalogs('lockfileVersion: 9.0\n') }, {})
  })
})

// ── diagnoseLockfileCatalogDrift ─────────────────────────────────────────────

function workspaceYaml(defaultCatalog: Record<string, string>): string {
  const lines = ['packages:', "  - '.'", 'catalog:']
  for (const [dep, ver] of Object.entries(defaultCatalog)) {
    lines.push(`  '${dep}': ${ver}`)
  }
  return `${lines.join('\n')}\n`
}

describe('diagnoseLockfileCatalogDrift', () => {
  test('in sync → no findings', () => {
    const ws = workspaceYaml({
      '@sinclair/typebox': '0.34.49',
      rolldown: '1.1.3',
    })
    const findings = diagnoseLockfileCatalogDrift({
      lockfileYaml: LOCK,
      workspaceYaml: ws,
    })
    assert.deepEqual(findings, [])
  })

  test('workspace bumped but lockfile stale → drift finding', () => {
    const ws = workspaceYaml({
      '@sinclair/typebox': '0.35.0',
      rolldown: '1.1.3',
    })
    const findings = diagnoseLockfileCatalogDrift({
      lockfileYaml: LOCK,
      workspaceYaml: ws,
    })
    assert.equal(findings.length, 1)
    assert.match(findings[0]!.what, /@sinclair\/typebox/)
    assert.match(findings[0]!.saw, /0\.35\.0.*0\.34\.49/)
    assert.equal(findings[0]!.fixable, false)
    assert.match(findings[0]!.fix, /pnpm install/)
  })

  test('dep absent from lockfile catalog → NOT drift (defined-but-unreferenced)', () => {
    // vite is in the workspace catalog but no package references it via
    // `catalog:`, so pnpm never records it in the lockfile catalogs. That is
    // not drift — flagging it would flood false positives (verified live: 11
    // such entries on the wheelhouse itself).
    const ws = workspaceYaml({
      '@sinclair/typebox': '0.34.49',
      rolldown: '1.1.3',
      vite: '5.0.0',
    })
    const findings = diagnoseLockfileCatalogDrift({
      lockfileYaml: LOCK,
      workspaceYaml: ws,
    })
    assert.deepEqual(findings, [])
  })

  test('all six finding ingredients are populated', () => {
    const ws = workspaceYaml({ rolldown: '9.9.9' })
    const [f] = diagnoseLockfileCatalogDrift({
      lockfileYaml: LOCK,
      workspaceYaml: ws,
    })
    assert.ok(f)
    for (const key of ['fix', 'saw', 'wanted', 'what', 'where'] as const) {
      assert.ok(f[key].length > 0, `${key} must be non-empty`)
    }
    assert.equal(f.fixable, false)
  })
})
