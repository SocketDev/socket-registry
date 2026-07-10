// vitest specs for the global-Claude-config hardening: applyHardening (setup
// side) sets drifted keys + no-ops when correct; hardeningViolations (check
// side) detects drift + passes when hardened. Pure functions — no ~/.claude.json
// is read or written.

import assert from 'node:assert/strict'

import { test } from 'vitest'

import { hardeningViolations } from '../../../scripts/fleet/check/claude-config-is-hardened.mts'
import {
  applyHardening,
  HARDENED_GLOBAL_CONFIG,
} from '../../../scripts/fleet/setup/claude-config.mts'

// ── the hardened set ────────────────────────────────────────────

test('copyOnSelect: false is the hardened value', () => {
  assert.equal(HARDENED_GLOBAL_CONFIG['copyOnSelect'], false)
})

// ── applyHardening (setup) ──────────────────────────────────────

test('applyHardening sets copyOnSelect when absent', () => {
  const config: Record<string, unknown> = { other: 1 }
  const changed = applyHardening(config)
  assert.deepEqual(changed, ['copyOnSelect'])
  assert.equal(config['copyOnSelect'], false)
  assert.equal(config['other'], 1) // unrelated keys preserved
})

test('applyHardening flips copyOnSelect when it drifted to true', () => {
  const config: Record<string, unknown> = { copyOnSelect: true }
  assert.deepEqual(applyHardening(config), ['copyOnSelect'])
  assert.equal(config['copyOnSelect'], false)
})

test('applyHardening is a no-op when already hardened', () => {
  const config: Record<string, unknown> = { copyOnSelect: false }
  assert.deepEqual(applyHardening(config), [])
})

// ── hardeningViolations (check) ─────────────────────────────────

test('hardeningViolations passes when hardened', () => {
  assert.deepEqual(hardeningViolations({ copyOnSelect: false }), [])
})

test('hardeningViolations flags copyOnSelect drifted to true', () => {
  const v = hardeningViolations({ copyOnSelect: true })
  assert.equal(v.length, 1)
  assert.equal(v[0]!.key, 'copyOnSelect')
  assert.equal(v[0]!.expected, false)
  assert.equal(v[0]!.actual, true)
})

test('hardeningViolations flags copyOnSelect absent (undefined !== false)', () => {
  const v = hardeningViolations({ unrelated: 1 })
  assert.equal(v.length, 1)
  assert.equal(v[0]!.actual, undefined)
})

test('setup applyHardening + check hardeningViolations agree (round-trip)', () => {
  const config: Record<string, unknown> = { copyOnSelect: true }
  applyHardening(config)
  assert.deepEqual(hardeningViolations(config), [])
})
