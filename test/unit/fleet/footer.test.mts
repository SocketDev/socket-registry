import assert from 'node:assert/strict'

import { test } from 'vitest'

import {
  FOOTER_CLOSE,
  FOOTER_HEADLINE,
  FOOTER_OPEN,
} from '../../../scripts/fleet/researching-recency/lib/markers.mts'
import { renderFooter } from '../../../scripts/fleet/researching-recency/lib/render/footer.mts'
import type { SourceResult } from '../../../scripts/fleet/researching-recency/lib/types.mts'
import type { Candidate } from '../../../scripts/fleet/researching-recency/lib/types.mts'

function makeCandidate(over: Partial<Candidate>): Candidate {
  return {
    candidateId: 'k',
    itemId: '1',
    source: 'hackernews',
    title: 'Rolldown is fast',
    url: 'https://rolldown.rs',
    snippet: 'a fast bundler',
    subqueryLabels: ['main'],
    nativeRanks: {},
    localRelevance: 0.8,
    freshness: 90,
    engagement: 50,
    sourceQuality: 0.8,
    rrfScore: 0.0164,
    sources: ['hackernews'],
    sourceItems: [
      {
        itemId: '1',
        source: 'hackernews',
        title: 'Rolldown is fast',
        body: '',
        url: 'https://rolldown.rs',
        container: 'Hacker News',
        publishedAt: '2026-06-06T00:00:00Z',
        engagement: { points: 186, comments: 122 },
        snippet: 'a fast bundler',
        metadata: {},
      },
    ],
    ...over,
  }
}

test('renderFooter bounds the per-source lines with the footer markers', () => {
  const results: SourceResult[] = [
    {
      source: 'hackernews',
      status: 'ok' as const,
      items: [makeCandidate({}).sourceItems[0]!],
    },
    {
      source: 'bluesky',
      status: 'skipped' as const,
      items: [],
      note: 'set BSKY_HANDLE',
    },
  ]
  const footer = renderFooter(results, '/tmp/x-raw.md')
  assert.ok(footer.startsWith(FOOTER_OPEN))
  assert.ok(footer.includes(FOOTER_HEADLINE))
  assert.ok(footer.includes('hackernews: 1 item'))
  assert.ok(footer.includes('bluesky: 0 items (set BSKY_HANDLE)'))
  assert.ok(footer.includes('Saved: /tmp/x-raw.md'))
  assert.ok(footer.trimEnd().endsWith(FOOTER_CLOSE))
})
