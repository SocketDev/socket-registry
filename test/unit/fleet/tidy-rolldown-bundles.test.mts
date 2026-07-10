// vitest specs for tidy-rolldown-bundles — the pure detectors
// (hasRolldownBundle / findFatShims / findMissingOverrides) against temp dirs.

import { describe, test } from 'vitest'
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import {
  CATALOG_PINNED_PREFIXES,
  findFatShims,
  findMissingOverrides,
  hasRolldownBundle,
  SHIM_MAX_BYTES,
} from '../../../.claude/skills/fleet/tidying-rolldown-bundles/lib/tidy-rolldown-bundles.mts'

function tmpRepo(): string {
  return mkdtempSync(path.join(os.tmpdir(), 'tidy-rolldown-'))
}

describe('hasRolldownBundle', () => {
  test('true when src/external exists', () => {
    const d = tmpRepo()
    mkdirSync(path.join(d, 'src', 'external'), { recursive: true })
    assert.equal(hasRolldownBundle(d), true)
  })

  test('true when scripts/bundle.mts exists', () => {
    const d = tmpRepo()
    mkdirSync(path.join(d, 'scripts'), { recursive: true })
    writeFileSync(path.join(d, 'scripts', 'bundle.mts'), '// bundle\n')
    assert.equal(hasRolldownBundle(d), true)
  })

  test('false for a plain repo', () => {
    assert.equal(hasRolldownBundle(tmpRepo()), false)
  })
})

describe('findFatShims', () => {
  test('flags an oversize external shim but not a thin one or a *-pack bundle', () => {
    const d = tmpRepo()
    const ext = path.join(d, 'src', 'external')
    mkdirSync(ext, { recursive: true })
    // Thin shim — fine.
    writeFileSync(
      path.join(ext, 'semver.js'),
      "module.exports = require('./npm-pack').semver\n",
    )
    // Fat re-vendored shim — flagged.
    writeFileSync(path.join(ext, 'huge.js'), 'x'.repeat(SHIM_MAX_BYTES + 1))
    // A consolidation bundle — large but exempt by the -pack suffix.
    writeFileSync(path.join(ext, 'npm-pack.js'), 'y'.repeat(SHIM_MAX_BYTES + 1))
    const fat = findFatShims(d)
    assert.ok(fat.some(f => f.includes('huge.js')))
    assert.ok(!fat.some(f => f.includes('semver.js')))
    assert.ok(!fat.some(f => f.includes('npm-pack.js')))
  })

  test('empty when there is no external/ dir', () => {
    assert.deepEqual(findFatShims(tmpRepo()), [])
  })
})

describe('findMissingOverrides', () => {
  test('flags a Socket prefix that is referenced but not catalog-pinned', () => {
    const d = tmpRepo()
    writeFileSync(
      path.join(d, 'pnpm-workspace.yaml'),
      [
        'overrides:',
        // referenced but NOT catalog-pinned → flagged
        "  '@socketregistry/packageurl-js': '1.4.2'",
        'packages:',
        '  - .',
      ].join('\n'),
    )
    const missing = findMissingOverrides(d)
    assert.ok(missing.includes('@socketregistry/'))
  })

  test('not flagged when at least one package under the prefix is catalog-pinned', () => {
    const d = tmpRepo()
    writeFileSync(
      path.join(d, 'pnpm-workspace.yaml'),
      [
        'overrides:',
        "  '@socketsecurity/lib': 'catalog:'",
        "  '@socketregistry/packageurl-js': 'catalog:'",
      ].join('\n'),
    )
    assert.deepEqual(findMissingOverrides(d), [])
  })

  test('exports the catalog-pinned prefixes', () => {
    assert.ok(CATALOG_PINNED_PREFIXES.includes('@socketsecurity/'))
    assert.ok(CATALOG_PINNED_PREFIXES.includes('@socketregistry/'))
  })
})
