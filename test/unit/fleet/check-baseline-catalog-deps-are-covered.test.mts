// vitest specs for baseline-catalog-deps-are-covered. Covers the pure
// uncoveredBaselineDeps diff helper AND a live-data regression assertion: the
// wheelhouse's own CANONICAL_CATALOG_DEPS must already be a subset of
// EXPECTED ∪ OPTIONAL catalog entries (the gap that shipped red member installs
// for @types/semver et al.). The live-data half needs the wheelhouse-only
// sync-scaffolding modules, so it skips in member repos (the cascade ships this
// test everywhere but scripts/repo/sync-scaffolding/ stays wheelhouse-only).

import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import path from 'node:path'

import { test } from 'vitest'

import { uncoveredBaselineDeps } from '../../../scripts/fleet/check/baseline-catalog-deps-are-covered.mts'

const SYNC_SCAFFOLDING_DIR = path.join(
  import.meta.dirname,
  '../../../scripts/repo/sync-scaffolding',
)
const IS_WHEELHOUSE = existsSync(SYNC_SCAFFOLDING_DIR)

// Import the wheelhouse-only modules through a computed specifier so tsc does
// not statically resolve them — members ship this test without the modules.
interface WheelhouseCatalogModule {
  CANONICAL_CATALOG_DEPS: readonly string[]
  EXPECTED_CATALOG_ENTRIES: Record<string, { version?: string | undefined }>
  OPTIONAL_CATALOG_ENTRIES: Record<string, unknown>
}
function wheelhouseModule(rel: string): Promise<WheelhouseCatalogModule> {
  return import(
    path.join(SYNC_SCAFFOLDING_DIR, rel)
  ) as Promise<WheelhouseCatalogModule>
}

// ── uncoveredBaselineDeps (pure helper) ─────────────────────────

test('uncoveredBaselineDeps returns [] when every baseline dep is in EXPECTED', () => {
  assert.deepEqual(uncoveredBaselineDeps(['a', 'b'], ['a', 'b', 'c'], []), [])
})

test('uncoveredBaselineDeps counts a baseline dep in neither map as a gap', () => {
  assert.deepEqual(
    uncoveredBaselineDeps(['@types/semver', 'oxlint'], ['oxlint'], []),
    ['@types/semver'],
  )
})

test('uncoveredBaselineDeps treats an OPTIONAL-only dep as covered', () => {
  assert.deepEqual(uncoveredBaselineDeps(['rolldown'], [], ['rolldown']), [])
})

test('uncoveredBaselineDeps sorts the gaps for stable output', () => {
  assert.deepEqual(
    uncoveredBaselineDeps(['semver', '@types/node', 'magic-string'], [], []),
    ['@types/node', 'magic-string', 'semver'],
  )
})

test('uncoveredBaselineDeps reports every uncovered dep, not just the first', () => {
  assert.deepEqual(uncoveredBaselineDeps(['x', 'y', 'z'], ['y'], []), [
    'x',
    'z',
  ])
})

// ── live regression guard (wheelhouse-only data) ────────────────
// This is the assertion that would have failed before the fix: the baseline
// wrote `@types/semver: catalog:` (+ @types/node, magic-string,
// markdownlint-cli2, semver, nock) onto members while EXPECTED/OPTIONAL didn't
// carry them, so each member install died with ERR_PNPM_CATALOG_ENTRY_NOT_FOUND.

test.skipIf(!IS_WHEELHOUSE)(
  'the live wheelhouse baseline catalog deps are all covered',
  async () => {
    const { EXPECTED_CATALOG_ENTRIES, OPTIONAL_CATALOG_ENTRIES } =
      await wheelhouseModule('manifest/catalog.mts')
    const { CANONICAL_CATALOG_DEPS } = await wheelhouseModule(
      'checks/package-baseline-is-current.mts',
    )
    const gaps = uncoveredBaselineDeps(
      CANONICAL_CATALOG_DEPS,
      Object.keys(EXPECTED_CATALOG_ENTRIES),
      Object.keys(OPTIONAL_CATALOG_ENTRIES),
    )
    assert.deepEqual(
      gaps,
      [],
      `Baseline \`catalog:\` deps missing from EXPECTED/OPTIONAL_CATALOG_ENTRIES: ${gaps.join(', ')}. ` +
        'Add each to catalog.mts + template/base/.config/fleet/pnpm-workspace.fleet.yaml.',
    )
  },
)

test.skipIf(!IS_WHEELHOUSE)(
  'the deps that triggered the incident are now resolved by EXPECTED',
  async () => {
    const { EXPECTED_CATALOG_ENTRIES } = await wheelhouseModule(
      'manifest/catalog.mts',
    )
    for (const name of [
      '@types/node',
      '@types/semver',
      'magic-string',
      'markdownlint-cli2',
      'nock',
      'semver',
    ]) {
      assert.ok(
        EXPECTED_CATALOG_ENTRIES[name]?.version,
        `${name} should resolve to a catalog version`,
      )
    }
  },
)
