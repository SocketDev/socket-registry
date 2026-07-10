// vitest specs for the researching-recency query-plan validator. Confirms the
// model-supplied plan JSON is accepted when well-formed, defaulted when thin,
// and rejected with a fix-it message when malformed.

import assert from 'node:assert/strict'

import { test } from 'vitest'

import {
  ALL_SOURCES,
  defaultPlan,
  KEYLESS_SOURCES,
  validatePlan,
} from '../../../scripts/fleet/researching-recency/lib/plan.mts'

// ── defaultPlan ─────────────────────────────────────────────────

test('defaultPlan searches every keyless source at equal weight', () => {
  const plan = defaultPlan('rolldown')
  assert.equal(plan.subqueries.length, 1)
  assert.equal(plan.subqueries[0]!.searchQuery, 'rolldown')
  assert.deepEqual(plan.subqueries[0]!.sources, [...KEYLESS_SOURCES])
  assert.equal(plan.freshnessMode, 'balancedRecent')
})

// ── validatePlan: happy path + defaults ─────────────────────────

test('validatePlan accepts a minimal plan and fills defaults', () => {
  const plan = validatePlan(
    {
      subqueries: [
        { label: 'main', searchQuery: 'rolldown', sources: ['github'] },
      ],
    },
    'rolldown',
  )
  assert.equal(plan.intent, 'overview')
  assert.equal(plan.freshnessMode, 'balancedRecent')
  assert.equal(plan.rawTopic, 'rolldown')
  // rankingQuery defaults to searchQuery, weight defaults to 1.
  assert.equal(plan.subqueries[0]!.rankingQuery, 'rolldown')
  assert.equal(plan.subqueries[0]!.weight, 1)
  assert.deepEqual(plan.sourceWeights, {})
  assert.deepEqual(plan.notes, [])
})

test('validatePlan preserves explicit fields', () => {
  const plan = validatePlan(
    {
      intent: 'comparison',
      freshnessMode: 'strictRecent',
      sourceWeights: { github: 1.5 },
      notes: ['peer set: esbuild, rspack'],
      subqueries: [
        {
          label: 'vs-esbuild',
          searchQuery: 'rolldown vs esbuild',
          rankingQuery: 'rolldown esbuild benchmark',
          sources: ['hackernews', 'reddit'],
          weight: 0.8,
        },
      ],
    },
    'rolldown vs esbuild',
  )
  assert.equal(plan.intent, 'comparison')
  assert.equal(plan.freshnessMode, 'strictRecent')
  assert.equal(plan.sourceWeights['github'], 1.5)
  assert.deepEqual(plan.notes, ['peer set: esbuild, rspack'])
  assert.equal(plan.subqueries[0]!.weight, 0.8)
  assert.equal(plan.subqueries[0]!.rankingQuery, 'rolldown esbuild benchmark')
})

// ── validatePlan: rejection paths ───────────────────────────────

test('validatePlan rejects a non-object plan', () => {
  assert.throws(() => validatePlan('nope', 't'), /Plan must be a JSON object/)
})

test('validatePlan rejects an empty or missing subqueries array', () => {
  assert.throws(
    () => validatePlan({}, 't'),
    /subqueries must be a non-empty array/,
  )
  assert.throws(
    () => validatePlan({ subqueries: [] }, 't'),
    /subqueries must be a non-empty array/,
  )
})

test('validatePlan rejects a subquery with no label', () => {
  assert.throws(
    () =>
      validatePlan(
        { subqueries: [{ searchQuery: 'x', sources: ['github'] }] },
        't',
      ),
    /label must be a non-empty string/,
  )
})

test('validatePlan rejects a label containing spaces (it keys streams)', () => {
  assert.throws(
    () =>
      validatePlan(
        {
          subqueries: [
            { label: 'has space', searchQuery: 'x', sources: ['github'] },
          ],
        },
        't',
      ),
    /label must not contain spaces/,
  )
})

test('validatePlan rejects an unknown source', () => {
  assert.throws(
    () =>
      validatePlan(
        {
          subqueries: [
            { label: 'main', searchQuery: 'x', sources: ['tiktok'] },
          ],
        },
        't',
      ),
    /is not a known source/,
  )
})

test('validatePlan rejects a non-positive weight', () => {
  assert.throws(
    () =>
      validatePlan(
        {
          subqueries: [
            { label: 'main', searchQuery: 'x', sources: ['github'], weight: 0 },
          ],
        },
        't',
      ),
    /weight must be a positive number/,
  )
})

test('validatePlan rejects an invalid freshnessMode', () => {
  assert.throws(
    () =>
      validatePlan(
        {
          freshnessMode: 'whenever',
          subqueries: [
            { label: 'main', searchQuery: 'x', sources: ['github'] },
          ],
        },
        't',
      ),
    /freshnessMode must be one of/,
  )
})

test('validatePlan rejects duplicate subquery labels', () => {
  assert.throws(
    () =>
      validatePlan(
        {
          subqueries: [
            { label: 'main', searchQuery: 'a', sources: ['github'] },
            { label: 'main', searchQuery: 'b', sources: ['reddit'] },
          ],
        },
        't',
      ),
    /labels must be unique/,
  )
})

// ── xHandles allow/deny ─────────────────────────────────────────

test('validatePlan accepts an xHandles allowlist', () => {
  const plan = validatePlan(
    {
      subqueries: [{ label: 'main', searchQuery: 'rolldown', sources: ['x'] }],
      xHandles: { allowed: ['youyuxi', '@patak_dev'] },
    },
    'rolldown',
  )
  assert.deepEqual(plan.xHandles?.allowed, ['youyuxi', '@patak_dev'])
  assert.equal(plan.xHandles?.excluded, undefined)
})

test('validatePlan accepts an xHandles denylist', () => {
  const plan = validatePlan(
    {
      subqueries: [{ label: 'main', searchQuery: 'rolldown', sources: ['x'] }],
      xHandles: { excluded: ['spambot'] },
    },
    'rolldown',
  )
  assert.deepEqual(plan.xHandles?.excluded, ['spambot'])
})

test('validatePlan rejects allowed + excluded together (mutually exclusive)', () => {
  assert.throws(
    () =>
      validatePlan(
        {
          subqueries: [{ label: 'main', searchQuery: 'x', sources: ['x'] }],
          xHandles: { allowed: ['a'], excluded: ['b'] },
        },
        't',
      ),
    /mutually exclusive/,
  )
})

test('validatePlan rejects a non-string-array handle list', () => {
  assert.throws(
    () =>
      validatePlan(
        {
          subqueries: [{ label: 'main', searchQuery: 'x', sources: ['x'] }],
          xHandles: { allowed: [123] },
        },
        't',
      ),
    /must be an array of X handle strings/,
  )
})

test('validatePlan leaves xHandles undefined when omitted', () => {
  const plan = validatePlan(
    { subqueries: [{ label: 'main', searchQuery: 'x', sources: ['x'] }] },
    't',
  )
  assert.equal(plan.xHandles, undefined)
})

// ── source registries ───────────────────────────────────────────

test('keyless sources are a subset of all sources and exclude bluesky', () => {
  for (const source of KEYLESS_SOURCES) {
    assert.ok(ALL_SOURCES.includes(source))
  }
  assert.ok(!KEYLESS_SOURCES.includes('bluesky'))
})
