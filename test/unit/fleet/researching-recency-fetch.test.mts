// socket-lint: mirror-exempt — imports from fetch.mts + rank.mts; split deferred
// vitest specs for the researching-recency fan-out orchestrator. Mocks HTTP
// with nock under disableNetConnect(); verifies that fetchAll expands the plan
// into per-(label, source) streams, annotates them with local scores, and
// collects per-source statuses.

import assert from 'node:assert/strict'

import nock from 'nock'
import { afterAll, afterEach, beforeAll, beforeEach, test } from 'vitest'

import { fetchAll } from '../../../scripts/fleet/researching-recency/lib/fetch.mts'
import { streamKeyOf } from '../../../scripts/fleet/researching-recency/lib/rank.mts'

import type {
  FetchContext,
  QueryPlan,
} from '../../../scripts/fleet/researching-recency/lib/types.mts'

const NOW = Date.parse('2026-06-07T00:00:00Z')
const CTX: FetchContext = { days: 30, now: NOW, perStream: 15 }

function planWith(
  sources: QueryPlan['subqueries'][number]['sources'],
): QueryPlan {
  return {
    intent: 'overview',
    freshnessMode: 'balancedRecent',
    rawTopic: 'rolldown',
    subqueries: [
      {
        label: 'main',
        searchQuery: 'rolldown',
        rankingQuery: 'rolldown',
        sources,
        weight: 1,
      },
    ],
    sourceWeights: {},
    notes: [],
  }
}

beforeAll(() => {
  nock.disableNetConnect()
})

afterAll(() => {
  nock.enableNetConnect()
})

afterEach(() => {
  nock.cleanAll()
})

beforeEach(() => {
  delete process.env['GITHUB_TOKEN']
  delete process.env['GH_TOKEN']
})

test('fetchAll keys a populated stream by (label, source) and annotates it', async () => {
  nock('https://hn.algolia.com')
    .get('/api/v1/search')
    .query(true)
    .reply(200, {
      hits: [
        {
          objectID: '1',
          title: 'rolldown is fast',
          url: 'https://rolldown.rs',
          author: 'a',
          points: 100,
          num_comments: 20,
          created_at_i: Math.floor(NOW / 1000) - 86_400,
        },
      ],
    })
  const { streams, results } = await fetchAll(planWith(['hackernews']), CTX)
  const key = streamKeyOf('main', 'hackernews')
  assert.ok(streams.has(key), 'stream keyed by main+hackernews')
  const item = streams.get(key)![0]!
  // annotateStream populated the local scores.
  assert.ok(item.localRankScore !== undefined)
  assert.ok(item.localRelevance !== undefined)
  assert.equal(results.length, 1)
  assert.equal(results[0]!.status, 'ok')
})

test('fetchAll reports a skipped source and omits its empty stream', async () => {
  delete process.env['BSKY_HANDLE']
  delete process.env['BSKY_APP_PASSWORD']
  const { streams, results } = await fetchAll(planWith(['bluesky']), CTX)
  assert.equal(streams.size, 0)
  assert.equal(results[0]!.status, 'skipped')
})

test('fetchAll surveys multiple sources, one dead source not sinking the rest', async () => {
  nock('https://hn.algolia.com')
    .get('/api/v1/search')
    .query(true)
    .reply(200, {
      hits: [
        {
          objectID: '1',
          title: 'rolldown',
          url: 'https://x.test',
          points: 50,
          num_comments: 5,
          created_at_i: Math.floor(NOW / 1000) - 86_400,
        },
      ],
    })
  nock('https://lobste.rs').get('/t/programming.json').reply(500)
  const { streams, results } = await fetchAll(
    planWith(['hackernews', 'lobsters']),
    CTX,
  )
  assert.ok(streams.has(streamKeyOf('main', 'hackernews')))
  const statuses = results.map(result => result.status).toSorted()
  assert.deepEqual(statuses, ['error', 'ok'])
})
