import assert from 'node:assert/strict'

import { test } from 'vitest'

import {
  BADGE_PREFIX,
  EVIDENCE_CLOSE,
  EVIDENCE_OPEN,
  FOOTER_OPEN,
} from '../../../scripts/fleet/researching-recency/lib/markers.mts'
import { renderCompact } from '../../../scripts/fleet/researching-recency/lib/render/compact.mts'
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

test('renderCompact emits badge, evidence envelope, and footer in order', () => {
  const output = renderCompact({
    candidates: [makeCandidate({})],
    results: [
      {
        source: 'hackernews',
        status: 'ok',
        items: [makeCandidate({}).sourceItems[0]!],
      },
    ],
    topic: 'rolldown',
    syncedDate: '2026-06-07',
    fromDate: '2026-05-08',
    savedPath: '/tmp/rolldown-raw.md',
  })
  assert.ok(output.split('\n')[0]!.startsWith(BADGE_PREFIX))
  assert.ok(output.includes(EVIDENCE_OPEN))
  assert.ok(output.includes('## Ranked Evidence Clusters'))
  assert.ok(output.includes('[Rolldown is fast](https://rolldown.rs)'))
  assert.ok(output.includes('186 points'))
  assert.ok(output.includes(EVIDENCE_CLOSE))
  assert.ok(output.indexOf(FOOTER_OPEN) > output.indexOf(EVIDENCE_CLOSE))
})
