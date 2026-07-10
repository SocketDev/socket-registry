import assert from 'node:assert/strict'

import { test } from 'vitest'

import type {
  GhRunner,
  ScanConfig,
  ScanState,
} from '../../../scripts/fleet/scan-pr-activity.mts'
import {
  expandHome,
  renderReport,
  resolveOrg,
  runScan,
  scanChanged,
} from '../../../scripts/fleet/scan-pr-activity.mts'

const CONFIG: ScanConfig = {
  authors: ['alice', 'bob'],
  dupPairs: [[100, 200]],
  repoDir: '~/projects/example',
  repoSlug: 'ExampleOrg/example',
  selfLogin: 'me',
  watchedComments: [
    { commentId: 11, pr: 1 },
    { commentId: 22, pr: 2 },
  ],
}

function freshState(): ScanState {
  return { reactions: {}, scannedAt: '2026-07-07T00:00:00Z' }
}

interface CandidateRow {
  author: { login: string }
  comments: Array<{ author: { login: string } }>
  isDraft?: boolean
  number: number
  title: string
  url: string
}

interface SearchRow {
  author?: { login?: string }
  isDraft?: boolean
  number: number
  repository?: { nameWithOwner?: string }
  title: string
  url: string
}

// A GhRunner scripted by route: watched pr-view, reaction api, review-request
// search, mention search, review-candidate pr-list, dup-state — keyed on
// distinctive argv fragments. Search routes default to [] (not undefined) so a
// quiet world produces no errors.
function scriptedGh(overrides?: {
  candidates?: CandidateRow[] | undefined
  comments?:
    | Record<number, Array<{ a: string; at: string; body: string }>>
    | undefined
  dupStates?: Record<number, string> | undefined
  mentions?: SearchRow[] | undefined
  prAuthors?: Record<number, string> | undefined
  prStates?: Record<number, string> | undefined
  reactions?: Record<number, number> | undefined
  reviews?: Record<number, Array<{ a: string; body: string }>> | undefined
  reviewRequests?: SearchRow[] | undefined
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
        state: opts.prStates?.[pr] ?? 'OPEN',
      })
    }
    if (joined.includes('issues/comments/')) {
      const id = Number(joined.split('issues/comments/')[1]!.split(' ')[0])
      return String(opts.reactions?.[id] ?? 0)
    }
    if (joined.includes('search prs')) {
      return JSON.stringify(opts.reviewRequests ?? [])
    }
    if (joined.includes('search issues')) {
      return JSON.stringify(opts.mentions ?? [])
    }
    if (joined.includes('pr list')) {
      return JSON.stringify(opts.candidates ?? [])
    }
    if (joined.includes('--json state')) {
      const pr = Number(args[2])
      return `${opts.dupStates?.[pr] ?? 'OPEN'}\n`
    }
    return undefined
  }
}

test('quiet world produces an unchanged report and the all-quiet line', () => {
  const report = runScan(CONFIG, freshState(), scriptedGh())
  assert.equal(scanChanged(report), false)
  const line = renderReport(CONFIG, report)
  assert.match(line, /^SCAN: all quiet — heartbeat green, example quiet/)
  assert.match(line, /#100\/#200 still open/)
  assert.match(line, /Board unchanged\.$/)
})

test('resolveOrg prefers config.org, falls back to the repoSlug owner', () => {
  assert.equal(resolveOrg(CONFIG), 'ExampleOrg')
  assert.equal(resolveOrg({ ...CONFIG, org: 'OtherOrg' }), 'OtherOrg')
})

test('a review requested of me surfaces; drafts and dependabot are skipped', () => {
  const report = runScan(
    CONFIG,
    freshState(),
    scriptedGh({
      reviewRequests: [
        {
          author: { login: 'alice' },
          number: 5,
          repository: { nameWithOwner: 'ExampleOrg/example' },
          title: 'please review',
          url: 'https://x/5',
        },
        {
          author: { login: 'alice' },
          isDraft: true,
          number: 6,
          repository: { nameWithOwner: 'ExampleOrg/example' },
          title: 'draft, skip',
          url: 'https://x/6',
        },
        {
          author: { login: 'dependabot[bot]' },
          number: 7,
          repository: { nameWithOwner: 'ExampleOrg/example' },
          title: 'chore: bump x',
          url: 'https://x/7',
        },
      ],
    }),
  )
  assert.deepEqual(report.reviewRequests, [
    'ExampleOrg/example#5 please review https://x/5',
  ])
  assert.match(
    renderReport(CONFIG, report),
    /review requested of you: ExampleOrg\/example#5/,
  )
})

test('a fresh @-mention of me surfaces; bot-authored items are skipped', () => {
  const report = runScan(
    CONFIG,
    freshState(),
    scriptedGh({
      mentions: [
        {
          author: { login: 'carol' },
          number: 9,
          repository: { nameWithOwner: 'ExampleOrg/other' },
          title: 'ping me',
          url: 'https://x/9',
        },
        {
          author: { login: 'renovate[bot]' },
          number: 10,
          title: 'renovate ping',
          url: 'https://x/10',
        },
      ],
    }),
  )
  assert.deepEqual(report.mentions, ['ExampleOrg/other#9 ping me https://x/9'])
  assert.match(renderReport(CONFIG, report), /@-mentioned: ExampleOrg\/other#9/)
})

test('a human reply after the last scan is surfaced; self and bots are not', () => {
  const report = runScan(
    CONFIG,
    freshState(),
    scriptedGh({
      comments: {
        1: [
          { a: 'me', at: '2026-07-07T05:00:00Z', body: 'mine' },
          { a: 'coderabbitai[bot]', at: '2026-07-07T05:00:00Z', body: 'bot' },
          {
            a: 'chatgpt-codex-connector',
            at: '2026-07-07T05:00:00Z',
            body: 'bot2',
          },
          { a: 'alice', at: '2026-07-07T05:00:00Z', body: 'question for you?' },
          { a: 'alice', at: '2026-07-06T05:00:00Z', body: 'old' },
        ],
      },
    }),
  )
  assert.equal(report.replies.length, 1)
  assert.equal(report.replies[0]!.author, 'alice')
  assert.equal(report.replies[0]!.role, 'team')
})

test('a fresh reply on a closed/merged watched PR is never surfaced', () => {
  const report = runScan(
    CONFIG,
    freshState(),
    scriptedGh({
      comments: {
        1: [
          { a: 'alice', at: '2026-07-07T05:00:00Z', body: 'still relevant?' },
        ],
      },
      prStates: { 1: 'MERGED' },
    }),
  )
  assert.deepEqual(report.replies, [])
})

test('reaction deltas are reported once and persisted into state', () => {
  const state = freshState()
  const gh = scriptedGh({ reactions: { 11: 2 } })
  const first = runScan(CONFIG, state, gh)
  assert.deepEqual(first.reactionChanges, [
    'comment 11 (PR 1): reactions 0 -> 2',
  ])
  const second = runScan(CONFIG, state, gh)
  assert.deepEqual(second.reactionChanges, [])
})

test('bot-only PRs by watched authors surface as review candidates; drafts and human-touched do not', () => {
  const report = runScan(
    CONFIG,
    freshState(),
    scriptedGh({
      candidates: [
        {
          author: { login: 'alice' },
          comments: [{ author: { login: 'pullfrog[bot]' } }],
          number: 7,
          title: 'bot-only pr',
          url: 'https://example.test/7',
        },
        {
          author: { login: 'alice' },
          comments: [{ author: { login: 'carol' } }],
          number: 8,
          title: 'human-touched pr',
          url: 'https://example.test/8',
        },
        {
          author: { login: 'alice' },
          comments: [],
          isDraft: true,
          number: 9,
          title: 'draft pr',
          url: 'https://example.test/9',
        },
        {
          author: { login: 'stranger' },
          comments: [],
          number: 10,
          title: 'not ours',
          url: 'https://example.test/10',
        },
      ],
    }),
  )
  assert.deepEqual(report.reviewCandidates, [
    '#7 bot-only pr https://example.test/7',
  ])
})

test('a PR I already commented on does not resurface as a candidate (loop converges)', () => {
  const report = runScan(
    CONFIG,
    freshState(),
    scriptedGh({
      candidates: [
        {
          author: { login: 'alice' },
          comments: [
            { author: { login: 'me' } },
            { author: { login: 'cursor' } },
          ],
          number: 7,
          title: 'already reviewed by me',
          url: 'https://example.test/7',
        },
      ],
    }),
  )
  assert.deepEqual(report.reviewCandidates, [])
})

test('a closed dup-pair member is reported', () => {
  const report = runScan(
    CONFIG,
    freshState(),
    scriptedGh({ dupStates: { 200: 'MERGED' } }),
  )
  assert.deepEqual(report.closedDups, ['#200 is now MERGED'])
})

test('gh failures surface as scan errors, never silent green', () => {
  const report = runScan(CONFIG, freshState(), () => undefined)
  assert.ok(report.errors.length >= 4)
  assert.equal(scanChanged(report), true)
})

test('expandHome expands only a leading tilde', () => {
  assert.ok(!expandHome('~/x').startsWith('~'))
  assert.equal(expandHome('/abs/x'), '/abs/x')
})
