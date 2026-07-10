// vitest specs for scripts/fleet/_shared/scope-flags.mts — the shared
// scope-flag resolver used by the fleet lint, test, check, and fix runners.

import assert from 'node:assert/strict'
import { describe, test } from 'vitest'

import {
  isScopeFlag,
  resolveScopeMode,
  SCOPE_FLAGS,
} from '../../../scripts/fleet/_shared/scope-flags.mts'

describe('scope-flags / SCOPE_FLAGS', () => {
  test('contains exactly the four recognized flags', () => {
    assert.deepEqual([...SCOPE_FLAGS].toSorted(), [
      '--all',
      '--changed',
      '--modified',
      '--staged',
    ])
  })

  test('is readonly (cannot be mutated without a cast)', () => {
    assert.ok(Object.isFrozen(SCOPE_FLAGS) || Array.isArray(SCOPE_FLAGS))
  })
})

describe('scope-flags / isScopeFlag', () => {
  test('returns true for every recognized flag', () => {
    assert.ok(isScopeFlag('--all'))
    assert.ok(isScopeFlag('--staged'))
    assert.ok(isScopeFlag('--modified'))
    assert.ok(isScopeFlag('--changed'))
  })

  test('returns false for unrecognized flags', () => {
    assert.ok(!isScopeFlag('--watch'))
    assert.ok(!isScopeFlag('--run'))
    assert.ok(!isScopeFlag(''))
    assert.ok(!isScopeFlag('all'))
    assert.ok(!isScopeFlag('staged'))
  })

  test('is case-sensitive', () => {
    assert.ok(!isScopeFlag('--ALL'))
    assert.ok(!isScopeFlag('--Staged'))
    assert.ok(!isScopeFlag('--Modified'))
  })
})

describe('scope-flags / resolveScopeMode', () => {
  test('returns "all" when --all is present', () => {
    assert.equal(resolveScopeMode(['--all']), 'all')
  })

  test('--all wins over --staged when both are present', () => {
    assert.equal(resolveScopeMode(['--staged', '--all']), 'all')
    assert.equal(resolveScopeMode(['--all', '--staged']), 'all')
  })

  test('--all wins over --modified when both are present', () => {
    assert.equal(resolveScopeMode(['--modified', '--all']), 'all')
  })

  test('--all wins over --changed when both are present', () => {
    assert.equal(resolveScopeMode(['--changed', '--all']), 'all')
  })

  test('returns "staged" when --staged is present (no --all)', () => {
    assert.equal(resolveScopeMode(['--staged']), 'staged')
  })

  test('--staged wins over --modified when both are present', () => {
    assert.equal(resolveScopeMode(['--modified', '--staged']), 'staged')
    assert.equal(resolveScopeMode(['--staged', '--modified']), 'staged')
  })

  test('--staged wins over --changed when both are present', () => {
    assert.equal(resolveScopeMode(['--changed', '--staged']), 'staged')
  })

  test('returns "modified" for --modified flag', () => {
    assert.equal(resolveScopeMode(['--modified']), 'modified')
  })

  test('returns "modified" for --changed alias', () => {
    assert.equal(resolveScopeMode(['--changed']), 'modified')
  })

  test('returns "modified" when no scope flag is present (default)', () => {
    assert.equal(resolveScopeMode([]), 'modified')
  })

  test('returns "modified" with unrecognized flags and no scope flag', () => {
    assert.equal(resolveScopeMode(['--watch', '--run']), 'modified')
  })

  test('ignores unrecognized flags when a scope flag is present', () => {
    assert.equal(resolveScopeMode(['--watch', '--all']), 'all')
    assert.equal(resolveScopeMode(['--run', '--staged']), 'staged')
  })

  test('works with extra positional args mixed in', () => {
    assert.equal(resolveScopeMode(['src/', '--all', '--fix']), 'all')
    assert.equal(resolveScopeMode(['src/', '--staged']), 'staged')
  })
})
