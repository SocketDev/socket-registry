import assert from 'node:assert/strict'

import { test } from 'vitest'

import { assessItems } from '../../../../scripts/fleet/team-activity/lib/filter.mts'
import { withDefaults } from '../../../../scripts/fleet/team-activity/lib/config.mts'
import type { RawCandidate } from '../../../../scripts/fleet/team-activity/lib/discover.mts'
import type { GhRunner } from '../../../../scripts/fleet/team-activity/lib/types.mts'

const CONFIG = withDefaults({ name: 'w', org: 'Acme', selfLogin: 'me' })

function cand(input: Partial<RawCandidate> & { number: number }): RawCandidate {
  return {
    author: input.author ?? 'alice',
    createdAt: '2026-01-01T00:00:00Z',
    draft: input.draft ?? false,
    kind: input.kind ?? 'pr',
    labels: input.labels ?? [],
    number: input.number,
    repo: input.repo ?? 'Acme/repo',
    title: `t${input.number}`,
    updatedAt: '2026-01-02T00:00:00Z',
    url: input.url ?? `https://x/${input.number}`,
  }
}

type Facts =
  | 'FAIL'
  | { commenters?: string[]; decision?: string; reviewers?: string[] }

function ghFacts(byNum: Record<number, Facts>): GhRunner {
  return args => {
    const joined = args.join(' ')
    if (!joined.includes('pr view') && !joined.includes('issue view')) {
      return undefined
    }
    const facts = byNum[Number(args[2])]
    if (facts === undefined || facts === 'FAIL') {
      return undefined
    }
    return JSON.stringify({
      commenters: facts.commenters ?? [],
      decision: facts.decision ?? '',
      reviewers: facts.reviewers ?? [],
    })
  }
}

test('drops drafts, self-engaged, and human-engaged items', () => {
  const candidates = [
    cand({ draft: true, number: 1 }),
    cand({ number: 2 }),
    cand({ number: 3 }),
  ]
  const gh = ghFacts({
    2: { commenters: ['me'] },
    3: { commenters: ['carol'] },
  })
  const result = assessItems(candidates, gh, CONFIG)
  assert.deepEqual(result.items, [])
  assert.equal(result.errors.length, 0)
})

test('surfaces items with only bot engagement or none, with a reason', () => {
  const candidates = [
    cand({ number: 4 }),
    cand({ number: 5 }),
    cand({ kind: 'issue', number: 6 }),
  ]
  const gh = ghFacts({
    4: { commenters: ['dependabot[bot]'] },
    5: { decision: 'REVIEW_REQUIRED' },
    6: {},
  })
  const result = assessItems(candidates, gh, CONFIG)
  const byNum = new Map(result.items.map(i => [i.number, i.reason]))
  assert.equal(byNum.get(4), 'open, no human review yet')
  assert.equal(byNum.get(5), 'open, review required, no human has looked yet')
  assert.equal(byNum.get(6), 'open, no response yet')
})

test('a fetch failure surfaces the item with a LOUD note and records an error', () => {
  const result = assessItems(
    [cand({ number: 9 })],
    ghFacts({ 9: 'FAIL' }),
    CONFIG,
  )
  assert.equal(result.items.length, 1)
  assert.match(result.items[0]!.reason, /review state could not be fetched/)
  assert.equal(result.errors.length, 1)
  assert.match(result.errors[0]!, /review-state fetch failed/)
})
