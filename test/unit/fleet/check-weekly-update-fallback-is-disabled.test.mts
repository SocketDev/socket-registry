// vitest spec for check-weekly-update-fallback-is-disabled — the pure
// enabledFallbackTracked detector. The git-ls-files orchestration (main) is
// covered by the check running in `check --all`.

import { describe, test } from 'vitest'
import assert from 'node:assert/strict'

import { enabledFallbackTracked } from '../../../scripts/fleet/check/weekly-update-fallback-is-disabled.mts'

describe('weekly-update-fallback-is-disabled — enabledFallbackTracked', () => {
  test('the shipped .yml.disabled form is NOT flagged', () => {
    assert.deepEqual(
      enabledFallbackTracked([
        '.github/workflows/weekly-update-non-gh-aw.yml.disabled',
      ]),
      [],
    )
  })
  test('the enabled .yml form IS flagged (auto-runs)', () => {
    assert.deepEqual(
      enabledFallbackTracked(['.github/workflows/weekly-update-non-gh-aw.yml']),
      ['.github/workflows/weekly-update-non-gh-aw.yml'],
    )
  })
  test('matches on basename even if .github relocates (win separators too)', () => {
    assert.deepEqual(
      enabledFallbackTracked(['ci\\workflows\\weekly-update-non-gh-aw.yml']),
      ['ci\\workflows\\weekly-update-non-gh-aw.yml'],
    )
  })
  test('unrelated workflows + the disabled form pass through', () => {
    assert.deepEqual(
      enabledFallbackTracked([
        '.github/workflows/ci.yml',
        '.github/workflows/weekly-update-non-gh-aw.yml.disabled',
        '.github/workflows/publish-npm.yml',
      ]),
      [],
    )
  })
  test('a look-alike (different basename) is NOT flagged', () => {
    assert.deepEqual(
      enabledFallbackTracked([
        '.github/workflows/weekly-update-non-gh-aw.yml.bak',
        '.github/workflows/my-weekly-update-non-gh-aw.yml.disabled',
      ]),
      [],
    )
  })
  test('empty list → empty', () => {
    assert.deepEqual(enabledFallbackTracked([]), [])
  })
})
