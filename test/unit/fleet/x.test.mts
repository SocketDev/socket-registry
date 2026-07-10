// vitest specs for the X-source handle allow/deny + payload building. These are
// pure functions (no network), so they live apart from the nock-mocked adapter
// suite: handle normalization, and how buildPayload wires allowed_x_handles /
// excluded_x_handles into the xAI x_search tool.

import assert from 'node:assert/strict'

import { test } from 'vitest'

import {
  buildPayload,
  normalizeHandles,
} from '../../../scripts/fleet/researching-recency/lib/sources/x.mts'

function xSearchTool(
  payload: Record<string, unknown>,
): Record<string, unknown> {
  return (payload['tools'] as Array<Record<string, unknown>>)[0]!
}

// ── normalizeHandles ────────────────────────────────────────────

test('normalizeHandles strips a leading @, trims, and de-dupes', () => {
  assert.deepEqual(normalizeHandles(['@youyuxi', 'youyuxi', ' patak_dev ']), [
    'youyuxi',
    'patak_dev',
  ])
})

test('normalizeHandles caps the list at 20 (the xAI limit)', () => {
  const many = Array.from({ length: 25 }, (_unused, i) => `h${i}`)
  assert.equal(normalizeHandles(many).length, 20)
})

test('normalizeHandles drops blank entries', () => {
  assert.deepEqual(normalizeHandles(['', '  ', '@real']), ['real'])
})

// ── buildPayload handle scoping ─────────────────────────────────

test('buildPayload sets allowed_x_handles for an allowlist', () => {
  const tool = xSearchTool(
    buildPayload('rolldown', '2026-05-08', '2026-06-07', 10, {
      allowedHandles: ['@rolldown_rs', 'youyuxi'],
    }),
  )
  assert.equal(tool['type'], 'x_search')
  assert.deepEqual(tool['allowed_x_handles'], ['rolldown_rs', 'youyuxi'])
  assert.equal(tool['excluded_x_handles'], undefined)
})

test('buildPayload sets excluded_x_handles for a denylist', () => {
  const tool = xSearchTool(
    buildPayload('rolldown', '2026-05-08', '2026-06-07', 10, {
      excludedHandles: ['spambot', 'noise_aggregator'],
    }),
  )
  assert.deepEqual(tool['excluded_x_handles'], ['spambot', 'noise_aggregator'])
  assert.equal(tool['allowed_x_handles'], undefined)
})

test('buildPayload lets the allowlist win when both are passed (API rejects both)', () => {
  const tool = xSearchTool(
    buildPayload('rolldown', '2026-05-08', '2026-06-07', 10, {
      allowedHandles: ['keep'],
      excludedHandles: ['drop'],
    }),
  )
  assert.deepEqual(tool['allowed_x_handles'], ['keep'])
  assert.equal(tool['excluded_x_handles'], undefined)
})

test('buildPayload carries the date window and no handle keys when none given', () => {
  const tool = xSearchTool(
    buildPayload('rolldown', '2026-05-08', '2026-06-07', 10),
  )
  assert.equal(tool['from_date'], '2026-05-08')
  assert.equal(tool['to_date'], '2026-06-07')
  assert.equal(tool['allowed_x_handles'], undefined)
  assert.equal(tool['excluded_x_handles'], undefined)
})
