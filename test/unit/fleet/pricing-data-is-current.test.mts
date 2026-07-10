// vitest specs for the pricing-data staleness check
// (scripts/fleet/check/pricing-data-is-current.mts): the per-service freshness
// computation (the v2 primary), the doc-marker parse (the fallback), and the
// whole-day age math that decide when the model-pricing data is stale.

import assert from 'node:assert/strict'

import { test } from 'vitest'

import {
  daysBetween,
  freshnessWindow,
  parseSnapshotDate,
  staleServices,
} from '../../../scripts/fleet/check/pricing-data-is-current.mts'

import type { PricingData } from '../../../scripts/fleet/estimate-ai-cost.mts'

// Minimal v2 fixture: only the fields staleServices reads (snapshot per service).
function pricingWithSnapshots(snapshots: Record<string, string>): PricingData {
  const services: PricingData['services'] = { __proto__: null } as never
  for (const service of Object.keys(snapshots)) {
    services[service] = {
      displayName: service,
      kind: 'test',
      models: {},
      pricingSource: `https://example.com/${service}`,
      snapshot: snapshots[service]!,
    }
  }
  return { currency: 'USD', schemaVersion: 2, services, unit: 'per-Mtok' }
}

// ── parseSnapshotDate ───────────────────────────────────────────

test('parseSnapshotDate reads the ISO date from the marker comment', () => {
  const date = parseSnapshotDate(
    '<!-- MODEL-PRICING-SNAPSHOT: 2026-06-11 -- anchor -->',
  )
  assert.equal(date?.toISOString().slice(0, 10), '2026-06-11')
})

test('parseSnapshotDate finds the marker amid surrounding prose', () => {
  const doc = [
    '# Skill model routing',
    'some prose',
    '<!-- MODEL-PRICING-SNAPSHOT: 2025-12-01 -- note -->',
    'more prose',
  ].join('\n')
  assert.equal(parseSnapshotDate(doc)?.toISOString().slice(0, 10), '2025-12-01')
})

test('parseSnapshotDate returns undefined when the marker is absent', () => {
  assert.equal(parseSnapshotDate('no marker in here'), undefined)
})

test('parseSnapshotDate returns undefined for an unparseable date', () => {
  // Month 99 is not a real date — Date parses it as NaN.
  assert.equal(
    parseSnapshotDate('<!-- MODEL-PRICING-SNAPSHOT: 2026-99-99 -->'),
    undefined,
  )
})

// ── daysBetween ─────────────────────────────────────────────────

test('daysBetween counts whole days forward', () => {
  const a = new Date('2026-06-01T00:00:00Z')
  const b = new Date('2026-06-11T00:00:00Z')
  assert.equal(daysBetween(a, b), 10)
})

test('daysBetween is zero for the same day', () => {
  const a = new Date('2026-06-11T00:00:00Z')
  assert.equal(daysBetween(a, a), 0)
})

test('daysBetween crosses the freshness window', () => {
  const snapshot = new Date('2026-04-01T00:00:00Z')
  const now = new Date('2026-06-11T00:00:00Z')
  // 71 days — well past any freshness window, so the check would remind.
  assert.equal(daysBetween(snapshot, now), 71)
})

// ── freshnessWindow ─────────────────────────────────────────────

test('freshnessWindow returns the default for an unspecified service', () => {
  assert.equal(freshnessWindow('anthropic'), 10)
})

test('freshnessWindow returns the tighter override for fast-rotating services', () => {
  assert.equal(freshnessWindow('fireworks'), 7)
  assert.equal(freshnessWindow('synthetic'), 7)
})

// ── staleServices ───────────────────────────────────────────────

test('staleServices flags only services past their own window', () => {
  const now = new Date('2026-06-20T00:00:00Z')
  // anthropic: 6d old (window 10) = fresh; fireworks: 10d old (window 7) = stale.
  const pricing = pricingWithSnapshots({
    anthropic: '2026-06-14',
    fireworks: '2026-06-10',
  })
  const stale = staleServices(pricing, now)
  assert.equal(stale.length, 1)
  assert.equal(stale[0]?.service, 'fireworks')
  assert.equal(stale[0]?.window, 7)
  assert.equal(stale[0]?.age, 10)
})

test('staleServices returns empty when every snapshot is fresh', () => {
  const now = new Date('2026-06-20T00:00:00Z')
  const pricing = pricingWithSnapshots({
    anthropic: '2026-06-18',
    fireworks: '2026-06-18',
  })
  assert.equal(staleServices(pricing, now).length, 0)
})

test('staleServices skips a service with an unparseable snapshot (fails open)', () => {
  const now = new Date('2026-06-20T00:00:00Z')
  const pricing = pricingWithSnapshots({ anthropic: 'not-a-date' })
  assert.equal(staleServices(pricing, now).length, 0)
})
