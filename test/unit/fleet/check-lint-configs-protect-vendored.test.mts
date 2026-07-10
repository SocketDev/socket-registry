// vitest spec for check-lint-configs-protect-vendored — the pure
// reexposedVendored detector. The directory scan (main / findReexposedVendored)
// is exercised by the check running in `check --all`.

import assert from 'node:assert/strict'
import { describe, test } from 'vitest'

import {
  PLUGIN_PATCH_PAYLOAD_GLOBS,
  PROTECTED_VENDORED_GLOBS,
  reexposedVendored,
} from '../../../scripts/fleet/check/lint-configs-protect-vendored.mts'

const PLUGIN_PATCH_FILES_GLOB = '**/scripts/fleet/plugin-patches/**/*.files/**'

describe('lint-configs-protect-vendored — reexposedVendored', () => {
  test('a vendored glob BEFORE the last negation is flagged (re-exposed)', () => {
    assert.deepEqual(
      reexposedVendored(['**/node_modules', '**/vendor/**', '!**/template/**']),
      ['**/vendor/**'],
    )
  })

  test('a vendored glob AFTER the last negation is safe', () => {
    assert.deepEqual(
      reexposedVendored(['**/node_modules', '!**/template/**', '**/vendor/**']),
      [],
    )
  })

  test('no negation → nothing re-exposed', () => {
    assert.deepEqual(reexposedVendored(['**/vendor/**', '**/node_modules']), [])
  })

  test('mixed positions — only the pre-negation vendored glob is flagged', () => {
    assert.deepEqual(
      reexposedVendored(['**/vendor/**', '!**/template/**', '**/wasm_exec.js']),
      ['**/vendor/**'],
    )
  })

  test('the real dogfood shape (all vendored re-excluded after the negation) is safe', () => {
    assert.deepEqual(
      reexposedVendored([
        '**/node_modules',
        '**/vendor/**',
        '!**/template/**',
        '**/wasm_exec.js',
        '**/vendor/**',
        '**/external/**',
      ]),
      [],
    )
  })

  test('the plugin-patch .files payload IS protected (so a re-include is flagged)', () => {
    assert.deepEqual(
      reexposedVendored([PLUGIN_PATCH_FILES_GLOB, '!**/template/**']),
      [PLUGIN_PATCH_FILES_GLOB],
    )
  })
})

describe('lint-configs-protect-vendored — canonical plugin-patch globs', () => {
  test('PLUGIN_PATCH_PAYLOAD_GLOBS carries the .files + .patch pair', () => {
    assert.deepEqual([...PLUGIN_PATCH_PAYLOAD_GLOBS].toSorted(), [
      '**/scripts/fleet/plugin-patches/**/*.files/**',
      '**/scripts/fleet/plugin-patches/**/*.patch',
    ])
  })

  test('PROTECTED_VENDORED_GLOBS shares the SAME .files glob (one source, not a copy)', () => {
    // DRY lock: the dogfood gen appends PROTECTED_VENDORED_GLOBS, the cascade
    // splicer uses PLUGIN_PATCH_PAYLOAD_GLOBS — both must resolve to one string.
    assert.ok(PROTECTED_VENDORED_GLOBS.includes(PLUGIN_PATCH_FILES_GLOB))
    assert.ok(PLUGIN_PATCH_PAYLOAD_GLOBS.includes(PLUGIN_PATCH_FILES_GLOB))
  })

  test('no glob keeps the stale `scripts/plugin-patches` (pre-relocation) anchor', () => {
    // Regression: the dir moved scripts/ → scripts/fleet/plugin-patches/. The old
    // glob kept the pre-move `scripts/plugin-patches/` anchor and silently matched
    // nothing. The canonical glob is anchored to the real scripts/fleet/ location;
    // the stale anchor must never reappear.
    for (const glob of [
      ...PLUGIN_PATCH_PAYLOAD_GLOBS,
      ...PROTECTED_VENDORED_GLOBS,
    ]) {
      assert.ok(
        !glob.includes('scripts/plugin-patches'),
        `glob is anchored on the stale scripts/ path: ${glob}`,
      )
    }
  })
})
