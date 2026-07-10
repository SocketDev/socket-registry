// vitest specs for app-tokens-are-scoped's pure matcher. The check fails the
// gate when a minter step (`mint-app-installation-token.mjs`) has no scoped
// `PERMISSIONS` env (blanket installation permissions). Imports the canonical
// template module (the cascaded live copy is byte-identical), so it's immune to
// cascade timing.

import assert from 'node:assert/strict'

import { test } from 'vitest'

import { findUnscopedAppTokenUses } from '../../../scripts/fleet/check/app-tokens-are-scoped.mts'

const SCOPED = [
  '    - id: app-token',
  '      shell: bash',
  '      env:',
  '        CLIENT_ID: ${{ inputs.client-id }}',
  `        PERMISSIONS: '{"contents":"write"}'`,
  '      run: node "${{ github.action_path }}/mint-app-installation-token.mjs"',
].join('\n')

const UNSCOPED = [
  '    - id: app-token',
  '      shell: bash',
  '      env:',
  '        CLIENT_ID: ${{ inputs.client-id }}',
  '      run: node "${{ github.action_path }}/mint-app-installation-token.mjs"',
].join('\n')

const EMPTY_SCOPE = [
  '    - id: app-token',
  '      shell: bash',
  '      env:',
  `        PERMISSIONS: '{}'`,
  '      run: node "${{ github.action_path }}/mint-app-installation-token.mjs"',
].join('\n')

test('a scoped minter step (non-blank PERMISSIONS) is not flagged', () => {
  assert.deepEqual(findUnscopedAppTokenUses(SCOPED), [])
})

test('a minter step with no PERMISSIONS env is flagged at the step item', () => {
  const hits = findUnscopedAppTokenUses(UNSCOPED)
  assert.equal(hits.length, 1)
  assert.equal(hits[0]!.line, 1)
})

test('a minter step with an empty-object PERMISSIONS is flagged', () => {
  const hits = findUnscopedAppTokenUses(EMPTY_SCOPE)
  assert.equal(hits.length, 1)
  assert.equal(hits[0]!.line, 1)
})

test('a file with no minter step is clean', () => {
  const yaml = [
    'steps:',
    '  - uses: actions/checkout@abc',
    '    with:',
    '      ref: main',
  ].join('\n')
  assert.deepEqual(findUnscopedAppTokenUses(yaml), [])
})

test("one step's PERMISSIONS does not satisfy the next minter step", () => {
  // Two minter steps: first scoped, second not. Only the second is flagged — the
  // first step's PERMISSIONS must not leak into the second.
  const yaml = [
    '    - id: a',
    '      env:',
    `        PERMISSIONS: '{"contents":"write"}'`,
    '      run: node mint-app-installation-token.mjs',
    '    - id: b',
    '      run: node mint-app-installation-token.mjs',
  ].join('\n')
  const hits = findUnscopedAppTokenUses(yaml)
  assert.equal(hits.length, 1)
  assert.equal(hits[0]!.line, 5)
})
