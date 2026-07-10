import assert from 'node:assert/strict'

import { test } from 'vitest'

import {
  attributeQuote,
  scanFollowUps,
} from '../../../../scripts/fleet/team-activity/lib/follow-ups.mts'
import { withDefaults } from '../../../../scripts/fleet/team-activity/lib/config.mts'
import type {
  GhRunner,
  ScanState,
} from '../../../../scripts/fleet/team-activity/lib/types.mts'

const CONFIG = withDefaults({
  authors: ['alice', 'bob'],
  dupPairs: [[100, 200]],
  name: 'eng-surf',
  org: 'Acme',
  repos: ['Acme/repo'],
  selfLogin: 'me',
  watchedComments: [
    { commentId: 11, pr: 1 },
    { commentId: 22, pr: 2 },
  ],
})

function freshState(): ScanState {
  return { reactions: {}, scannedAt: '2026-07-07T00:00:00Z' }
}

function scriptedGh(overrides?: {
  comments?: Record<number, Array<{ a: string; at: string; body: string }>>
  dupStates?: Record<number, string>
  prAuthors?: Record<number, string>
  reactions?: Record<number, number>
  reviews?: Record<number, Array<{ a: string; body: string }>>
}): GhRunner {
  const opts = { __proto__: null, ...overrides } as NonNullable<
    typeof overrides
  >
  return args => {
    const joined = args.join(' ')
    if (joined.includes('--json author,comments,reviews')) {
      const pr = Number(args[2])
      return JSON.stringify({
        author: opts.prAuthors?.[pr] ?? 'someone',
        comments: opts.comments?.[pr] ?? [],
        reviews: opts.reviews?.[pr] ?? [],
      })
    }
    if (joined.includes('issues/comments/')) {
      const id = Number(joined.split('issues/comments/')[1]!.split(' ')[0])
      return String(opts.reactions?.[id] ?? 0)
    }
    if (joined.includes('--json state')) {
      return `${opts.dupStates?.[Number(args[2])] ?? 'OPEN'}\n`
    }
    return undefined
  }
}

test('attributeQuote maps a quote to the review or comment it echoes', () => {
  const reviews = [{ a: 'bret', body: 'the button name is too broad, rename?' }]
  const reply = {
    a: 'carol',
    body: '> the button name is too broad\n\nthe modal covers it',
  }
  assert.equal(attributeQuote(reply, [], reviews), "bret's review")
  assert.equal(
    attributeQuote(
      { a: 'alice', body: '> retries are dropped silently\n\nfixed' },
      [{ a: 'me', body: 'retries are dropped silently in the fan-out' }],
      [],
    ),
    "me's comment",
  )
  assert.equal(
    attributeQuote({ a: 'x', body: 'no quote here' }, [], []),
    undefined,
  )
})

test('a human reply after the last scan is surfaced; self and bots are not', () => {
  const report = scanFollowUps(
    CONFIG,
    freshState(),
    scriptedGh({
      comments: {
        1: [
          { a: 'me', at: '2026-07-07T05:00:00Z', body: 'mine' },
          { a: 'cursor[bot]', at: '2026-07-07T05:00:00Z', body: 'bot' },
          { a: 'alice', at: '2026-07-07T05:00:00Z', body: 'question?' },
          { a: 'alice', at: '2026-07-06T05:00:00Z', body: 'old' },
        ],
      },
    }),
  )
  assert.equal(report.replies.length, 1)
  assert.equal(report.replies[0]!.author, 'alice')
  assert.equal(report.replies[0]!.role, 'team')
  assert.equal(report.replies[0]!.repo, 'Acme/repo')
})

test('reaction deltas report once, then persist into state', () => {
  const state = freshState()
  const gh = scriptedGh({ reactions: { 11: 2 } })
  const first = scanFollowUps(CONFIG, state, gh)
  assert.deepEqual(first.reactionChanges, [
    'comment 11 (PR 1): reactions 0 -> 2',
  ])
  const second = scanFollowUps(CONFIG, state, gh)
  assert.deepEqual(second.reactionChanges, [])
})

test('a closed dup-pair member is reported', () => {
  const report = scanFollowUps(
    CONFIG,
    freshState(),
    scriptedGh({ dupStates: { 200: 'MERGED' } }),
  )
  assert.deepEqual(report.closedDups, ['#200 is now MERGED'])
})

test('gh failures surface as errors, never silent green', () => {
  const report = scanFollowUps(CONFIG, freshState(), () => undefined)
  assert.ok(report.errors.length >= 4)
})
