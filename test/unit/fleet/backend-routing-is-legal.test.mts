// vitest specs for the backend-routing-is-legal check
// (scripts/fleet/check/backend-routing-is-legal.mts): the preference-order
// scanner that flags unknown or hybrid backends in a routing table.

import assert from 'node:assert/strict'

import { test } from 'vitest'

import {
  lineOf,
  scanRouting,
} from '../../../scripts/fleet/check/backend-routing-is-legal.mts'

// ── scanRouting ─────────────────────────────────────────────────

test('a legal preference order produces no violations', () => {
  const src = `const ROLES = {\n  discovery: { preferenceOrder: ['codex', 'kimi', 'claude'] },\n}\n`
  assert.deepEqual(scanRouting(src, 'run.mts'), [])
})

test('flags an unknown backend name', () => {
  const src = `preferenceOrder: ['codex', 'gpt5', 'claude']\n`
  const v = scanRouting(src, 'run.mts')
  assert.equal(v.length, 1)
  assert.match(v[0]!.detail, /unknown backend "gpt5"/)
})

test('flags a hybrid backend listed in the order (auto-pick ban)', () => {
  const src = `preferenceOrder: ['opencode', 'claude']\n`
  const v = scanRouting(src, 'run.mts')
  assert.equal(v.length, 1)
  assert.match(v[0]!.detail, /hybrid backend "opencode"/)
})

test('reports both an unknown and a hybrid entry in one order', () => {
  const src = `preferenceOrder: ['opencode', 'bogus']\n`
  const v = scanRouting(src, 'run.mts')
  assert.equal(v.length, 2)
})

test('ignores source with no preference order', () => {
  assert.deepEqual(scanRouting('const x = 1\n', 'foo.mts'), [])
})

// ── lineOf ──────────────────────────────────────────────────────

test('lineOf returns the 1-based line of an offset', () => {
  const text = 'a\nb\nc\n'
  assert.equal(lineOf(text, 0), 1)
  assert.equal(lineOf(text, 2), 2)
  assert.equal(lineOf(text, 4), 3)
})
