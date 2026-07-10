// vitest specs for the researching-recency reciprocal-rank fusion. Locks the
// RRF accumulation, cross-stream merge + display promotion, per-author cap, and
// URL canonicalization against the upstream last30days `fusion.py` reference.

import assert from 'node:assert/strict'

import { test } from 'vitest'

import {
  candidateKey,
  normalizeUrl,
  parseStreamKey,
  RRF_K,
  streamKeyOf,
  weightedRrf,
} from '../../../scripts/fleet/researching-recency/lib/rank.mts'

import type {
  QueryPlan,
  SourceItem,
  SubQuery,
} from '../../../scripts/fleet/researching-recency/lib/types.mts'

function makeItem(over: Partial<SourceItem>): SourceItem {
  return {
    itemId: 'x',
    source: 'hackernews',
    title: 'title',
    body: '',
    url: 'https://example.test/x',
    engagement: {},
    snippet: 'snippet',
    metadata: {},
    localRelevance: 0.5,
    freshness: 50,
    sourceQuality: 0.8,
    ...over,
  }
}

function makePlan(over: Partial<QueryPlan> = {}): QueryPlan {
  const subquery: SubQuery = {
    label: 'main',
    searchQuery: 'rolldown',
    rankingQuery: 'rolldown',
    sources: ['hackernews', 'github'],
    weight: 1,
  }
  return {
    intent: 'overview',
    freshnessMode: 'balancedRecent',
    rawTopic: 'rolldown',
    subqueries: [subquery],
    sourceWeights: {},
    notes: [],
    ...over,
  }
}

// Reuse the engine's own key builder so the test can't drift from the format.
const streamKey = streamKeyOf

// ── stream keys ─────────────────────────────────────────────────

test('streamKeyOf and parseStreamKey round-trip a label + source', () => {
  const key = streamKeyOf('main', 'hackernews')
  assert.deepEqual(parseStreamKey(key), { label: 'main', source: 'hackernews' })
})

// ── normalizeUrl ────────────────────────────────────────────────

test('normalizeUrl lowercases, strips www/m, trailing slash, utm params', () => {
  assert.equal(
    normalizeUrl('HTTPS://WWW.Example.com/Path/?utm_source=x&q=1'),
    'https://example.com/path?q=1',
  )
  assert.equal(
    normalizeUrl('https://m.example.com/a/'),
    'https://example.com/a',
  )
})

test('normalizeUrl falls back to the lowercased raw string when unparseable', () => {
  assert.equal(normalizeUrl('not a url'), 'not a url')
})

// ── candidateKey ────────────────────────────────────────────────

test('candidateKey uses the canonical URL, or source:itemId when URL-less', () => {
  assert.equal(
    candidateKey(makeItem({ url: 'https://www.example.com/a/' })),
    'https://example.com/a',
  )
  assert.equal(
    candidateKey(makeItem({ url: '', source: 'reddit', itemId: 'abc' })),
    'reddit:abc',
  )
})

// ── weightedRrf ─────────────────────────────────────────────────

test('weightedRrf scores a single stream by weight / (RRF_K + rank)', () => {
  const items = [
    makeItem({ itemId: 'a', url: 'https://example.test/a' }),
    makeItem({ itemId: 'b', url: 'https://example.test/b' }),
  ]
  const streams = new Map([[streamKey('main', 'hackernews'), items]])
  const fused = weightedRrf(streams, makePlan(), 10)
  assert.equal(fused[0]!.itemId, 'a')
  assert.ok(Math.abs(fused[0]!.rrfScore - 1 / (RRF_K + 1)) < 1e-9)
  assert.ok(Math.abs(fused[1]!.rrfScore - 1 / (RRF_K + 2)) < 1e-9)
})

test('weightedRrf accumulates score for a candidate seen in two streams', () => {
  const shared = 'https://example.test/shared'
  const streams = new Map([
    [
      streamKey('main', 'hackernews'),
      [makeItem({ itemId: 'h', url: shared, source: 'hackernews' })],
    ],
    [
      streamKey('main', 'github'),
      [makeItem({ itemId: 'g', url: shared, source: 'github' })],
    ],
  ])
  const fused = weightedRrf(streams, makePlan(), 10)
  // Same canonical URL -> one merged candidate carrying both sources.
  assert.equal(fused.length, 1)
  assert.ok(Math.abs(fused[0]!.rrfScore - 2 / (RRF_K + 1)) < 1e-9)
  assert.deepEqual(fused[0]!.sources.toSorted(), ['github', 'hackernews'])
})

test('weightedRrf applies per-source weight from the plan', () => {
  const streams = new Map([
    [
      streamKey('main', 'github'),
      [
        makeItem({
          itemId: 'g',
          url: 'https://example.test/g',
          source: 'github',
        }),
      ],
    ],
  ])
  const plan = makePlan({ sourceWeights: { github: 2 } })
  const fused = weightedRrf(streams, plan, 10)
  assert.ok(Math.abs(fused[0]!.rrfScore - 2 / (RRF_K + 1)) < 1e-9)
})

test('weightedRrf promotes display fields to the higher primary-score item', () => {
  const shared = 'https://example.test/shared'
  const weak = makeItem({
    itemId: 'weak',
    url: shared,
    title: 'weak title',
    localRelevance: 0.2,
    freshness: 10,
    sourceQuality: 0.6,
  })
  const strong = makeItem({
    itemId: 'strong',
    url: shared,
    title: 'strong title',
    localRelevance: 0.9,
    freshness: 90,
    sourceQuality: 0.9,
  })
  // weak arrives first (lower stream), strong second -> strong should win display.
  const streams = new Map([
    [streamKey('main', 'reddit'), [weak]],
    [streamKey('main', 'github'), [strong]],
  ])
  const fused = weightedRrf(streams, makePlan(), 10)
  assert.equal(fused[0]!.title, 'strong title')
  assert.equal(fused[0]!.localRelevance, 0.9)
})

test('weightedRrf caps a single author at three items', () => {
  const items = Array.from({ length: 5 }, (_unused, index) =>
    makeItem({
      itemId: `i${index}`,
      url: `https://example.test/i${index}`,
      author: 'sameauthor',
    }),
  )
  const streams = new Map([[streamKey('main', 'reddit'), items]])
  const fused = weightedRrf(streams, makePlan(), 10)
  assert.equal(fused.length, 3)
})

test('weightedRrf truncates to the pool limit', () => {
  const items = Array.from({ length: 8 }, (_unused, index) =>
    makeItem({
      itemId: `i${index}`,
      url: `https://example.test/i${index}`,
      author: `a${index}`,
    }),
  )
  const streams = new Map([[streamKey('main', 'hackernews'), items]])
  assert.equal(weightedRrf(streams, makePlan(), 3).length, 3)
})

test('weightedRrf skips a stream whose label is not in the plan', () => {
  const streams = new Map([
    [
      streamKey('ghost', 'hackernews'),
      [makeItem({ itemId: 'a', url: 'https://example.test/a' })],
    ],
  ])
  assert.equal(weightedRrf(streams, makePlan(), 10).length, 0)
})
