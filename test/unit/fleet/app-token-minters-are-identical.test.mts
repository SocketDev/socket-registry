// vitest specs for app-token-minters-are-identical's pure drift detector. The
// gate fails when the co-located minter copies are not byte-identical. Imports
// the canonical template module (the cascaded live copy is byte-identical), so
// it's immune to cascade timing.

import assert from 'node:assert/strict'

import { test } from 'vitest'

import { findDrift } from '../../../scripts/fleet/check/app-token-minters-are-identical.mts'

test('identical copies report no drift', () => {
  const copies = [
    { content: 'X', relPath: 'a/mint-app-installation-token.mjs' },
    { content: 'X', relPath: 'b/mint-app-installation-token.mjs' },
    { content: 'X', relPath: 'c/mint-app-installation-token.mjs' },
  ]
  assert.deepEqual(findDrift(copies), [])
})

test('a divergent copy is reported by relPath', () => {
  const copies = [
    { content: 'X', relPath: 'a/mint-app-installation-token.mjs' },
    { content: 'Y', relPath: 'b/mint-app-installation-token.mjs' },
    { content: 'X', relPath: 'c/mint-app-installation-token.mjs' },
  ]
  assert.deepEqual(findDrift(copies), ['b/mint-app-installation-token.mjs'])
})

test('fewer than two copies is never drift', () => {
  assert.deepEqual(findDrift([{ content: 'X', relPath: 'a' }]), [])
  assert.deepEqual(findDrift([]), [])
})
