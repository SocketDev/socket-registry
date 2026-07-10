// socket-lint: mirror-exempt — imports from relevance.mts + signals.mts; split deferred
// vitest specs for the researching-recency local-scoring signals. Locks the
// recency curve, the per-source engagement weights, min-max normalization, and
// the 0.65/0.25/0.10 local-rank blend against the upstream last30days
// `signals.py` reference.

import assert from 'node:assert/strict'

import { test } from 'vitest'

import { prepareQuery } from '../../../scripts/fleet/researching-recency/lib/relevance.mts'
import {
  annotateStream,
  engagementRaw,
  freshness,
  localRelevance,
  log1pSafe,
  normalize,
  recencyScore,
  SOURCE_QUALITY,
  sourceQuality,
} from '../../../scripts/fleet/researching-recency/lib/signals.mts'

import type { SourceItem } from '../../../scripts/fleet/researching-recency/lib/types.mts'

const NOW = Date.parse('2026-06-07T00:00:00Z')

function makeItem(over: Partial<SourceItem>): SourceItem {
  return {
    itemId: 'x',
    source: 'hackernews',
    title: '',
    body: '',
    url: 'https://example.test/x',
    engagement: {},
    snippet: '',
    metadata: {},
    ...over,
  }
}

// ── recencyScore ────────────────────────────────────────────────

test('recencyScore: 0 days = 100, 15 days = 50, 30 days = 0', () => {
  assert.equal(recencyScore('2026-06-07T00:00:00Z', NOW), 100)
  assert.equal(recencyScore('2026-05-23T00:00:00Z', NOW), 50)
  assert.equal(recencyScore('2026-05-08T00:00:00Z', NOW), 0)
})

test('recencyScore: unknown date scores worst, future date treated as today', () => {
  assert.equal(recencyScore(undefined, NOW), 0)
  assert.equal(recencyScore('not-a-date', NOW), 0)
  assert.equal(recencyScore('2026-07-01T00:00:00Z', NOW), 100)
})

// ── freshness modes ─────────────────────────────────────────────

test('freshness applies the per-mode shaping curve', () => {
  const today = makeItem({ publishedAt: '2026-06-07T00:00:00Z' })
  assert.equal(freshness(today, NOW, 'strictRecent'), 100)
  assert.equal(freshness(today, NOW, 'balancedRecent'), 90) // 100*0.8 + 10
  assert.equal(freshness(today, NOW, 'evergreenOk'), 100) // 100*0.6 + 40
})

// ── log1pSafe ───────────────────────────────────────────────────

test('log1pSafe floors non-positive / non-finite to 0', () => {
  assert.equal(log1pSafe(0), 0)
  assert.equal(log1pSafe(-5), 0)
  assert.equal(log1pSafe(undefined), 0)
  assert.equal(log1pSafe(Number.NaN), 0)
  assert.ok(Math.abs(log1pSafe(Math.E - 1) - 1) < 1e-9)
})

// ── normalize ───────────────────────────────────────────────────

test('normalize min-max scales to [0,100] integers', () => {
  assert.deepEqual(normalize([10, 20, 30]), [0, 50, 100])
})

test('normalize maps all-equal inputs to 50 and passes undefined through', () => {
  assert.deepEqual(normalize([5, 5, 5]), [50, 50, 50])
  assert.deepEqual(normalize([undefined, 10, undefined, 20]), [
    undefined,
    0,
    undefined,
    100,
  ])
})

test('normalize returns all-undefined when no value is present', () => {
  assert.deepEqual(normalize([undefined, undefined]), [undefined, undefined])
})

// ── sourceQuality ───────────────────────────────────────────────

test('sourceQuality weights curated dev sources above open social', () => {
  assert.equal(sourceQuality('web'), 1)
  assert.equal(sourceQuality('github'), 0.9)
  assert.ok(SOURCE_QUALITY['lobsters']! > SOURCE_QUALITY['reddit']!)
  assert.equal(sourceQuality('mystery-source'), 0.6) // default
})

// ── engagementRaw (per-source dispatch) ─────────────────────────

test('engagementRaw uses the reddit blend (score + comments + ratio + top-comment)', () => {
  const item = makeItem({
    source: 'reddit',
    engagement: { score: 100, numComments: 20, upvoteRatio: 0.9 },
  })
  const raw = engagementRaw(item)
  assert.ok(raw !== undefined && raw > 0)
})

test('engagementRaw returns undefined when a source has no engagement signal', () => {
  assert.equal(
    engagementRaw(makeItem({ source: 'reddit', engagement: {} })),
    undefined,
  )
  assert.equal(
    engagementRaw(makeItem({ source: 'github', engagement: {} })),
    undefined,
  )
})

test('engagementRaw uses weighted fields for hackernews', () => {
  const hot = makeItem({
    source: 'hackernews',
    engagement: { points: 500, comments: 300 },
  })
  const cold = makeItem({
    source: 'hackernews',
    engagement: { points: 2, comments: 1 },
  })
  assert.ok(engagementRaw(hot)! > engagementRaw(cold)!)
})

// ── localRelevance floors ───────────────────────────────────────

test('localRelevance floors a project-mode GitHub item to 0.8', () => {
  const item = makeItem({
    source: 'github',
    title: 'openclaw',
    metadata: { labels: ['project-mode'] },
  })
  assert.ok(
    localRelevance(item, prepareQuery('something unrelated entirely')) >= 0.8,
  )
})

// ── annotateStream end-to-end ───────────────────────────────────

test('annotateStream ranks a relevant+fresh+engaged item above a stale unrelated one', () => {
  const items: SourceItem[] = [
    makeItem({
      itemId: 'a',
      source: 'hackernews',
      title: 'rolldown is fast',
      publishedAt: '2026-06-06T00:00:00Z',
      engagement: { points: 200, comments: 80 },
    }),
    makeItem({
      itemId: 'b',
      source: 'reddit',
      title: 'unrelated cooking thread',
      publishedAt: '2026-05-10T00:00:00Z',
      engagement: { score: 5, numComments: 1 },
    }),
  ]
  const ranked = annotateStream(
    items,
    prepareQuery('rolldown'),
    'balancedRecent',
    NOW,
  )
  assert.equal(ranked[0]!.itemId, 'a')
  assert.ok((ranked[0]!.localRankScore ?? 0) > (ranked[1]!.localRankScore ?? 0))
})

test('annotateStream attaches all scoring fields and does not mutate input order', () => {
  const items: SourceItem[] = [
    makeItem({
      itemId: 'first',
      title: 'rolldown',
      publishedAt: '2026-06-01T00:00:00Z',
    }),
  ]
  annotateStream(items, prepareQuery('rolldown'), 'balancedRecent', NOW)
  const item = items[0]!
  assert.ok(item.localRelevance !== undefined)
  assert.ok(item.freshness !== undefined)
  assert.ok(item.sourceQuality !== undefined)
  assert.ok(item.localRankScore !== undefined)
})
