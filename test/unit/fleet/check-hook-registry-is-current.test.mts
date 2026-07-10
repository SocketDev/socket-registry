// vitest specs for check-hook-registry-is-current.

import assert from 'node:assert/strict'

import { test } from 'vitest'

import {
  capabilityGatedBullets,
  registryBullets,
  staleBullets,
} from '../../../scripts/fleet/check/hook-registry-is-current.mts'

// ── registryBullets ─────────────────────────────────────────────

test('registryBullets captures the backticked hook id from each bullet', () => {
  const md = [
    '## Hooks',
    '',
    '- `token-guard` — redacts secrets.',
    '- `no-revert-guard` — blocks reverts.',
    'prose line, not a bullet',
    '- `excuse-detector` — flags excuses.',
  ].join('\n')
  assert.deepEqual(registryBullets(md), [
    'token-guard',
    'no-revert-guard',
    'excuse-detector',
  ])
})

test('registryBullets ignores non-bullet backticks', () => {
  const md = 'Use the `foo` helper.\n- `real-hook` — yes.'
  assert.deepEqual(registryBullets(md), ['real-hook'])
})

// ── capabilityGatedBullets ──────────────────────────────────────

test('capabilityGatedBullets picks up bullets citing @socket-capability', () => {
  const md = [
    '- `plain-guard` — no gating.',
    '- `concurrent-cargo-build-guard` — OOM guard. Capability-gated via the `@socket-capability cargo` header.',
  ].join('\n')
  const gated = capabilityGatedBullets(md)
  assert.ok(gated.has('concurrent-cargo-build-guard'))
  assert.ok(!gated.has('plain-guard'))
})

test('capabilityGatedBullets is empty when no bullet declares a capability', () => {
  const md = '- `a-guard` — x.\n- `b-guard` — y.'
  assert.equal(capabilityGatedBullets(md).size, 0)
})

// ── staleBullets ────────────────────────────────────────────────

test('staleBullets flags a bullet with no matching hook dir', () => {
  const stale = staleBullets(
    ['token-guard', 'gone-guard'],
    new Set(['token-guard']),
  )
  assert.deepEqual(stale, ['gone-guard'])
})

test('staleBullets passes when every bullet names a real hook', () => {
  const stale = staleBullets(['a', 'b'], new Set(['a', 'b']))
  assert.equal(stale.length, 0)
})

test('staleBullets does NOT flag a capability-gated hook that is absent locally', () => {
  // The cargo hook is legitimately absent in a non-cargo repo; its bullet is
  // gated, so it must not count as stale.
  const stale = staleBullets(
    ['token-guard', 'concurrent-cargo-build-guard'],
    new Set(['token-guard']),
    new Set(['concurrent-cargo-build-guard']),
  )
  assert.equal(stale.length, 0)
})

test('staleBullets STILL flags a non-gated absent hook even when a gated set is passed', () => {
  const stale = staleBullets(
    ['real', 'gated-absent', 'typo-guard'],
    new Set(['real']),
    new Set(['gated-absent']),
  )
  assert.deepEqual(stale, ['typo-guard'])
})

test('staleBullets returns the stale set sorted', () => {
  const stale = staleBullets(['zeta', 'alpha', 'mid'], new Set())
  assert.deepEqual(stale, ['alpha', 'mid', 'zeta'])
})
