import assert from 'node:assert/strict'

import { test } from 'vitest'

import {
  renderReport,
  scanChanged,
} from '../../../../scripts/fleet/team-activity/lib/render.mts'
import { withDefaults } from '../../../../scripts/fleet/team-activity/lib/config.mts'
import type {
  ActivityItem,
  ScanReport,
} from '../../../../scripts/fleet/team-activity/lib/types.mts'

const CONFIG = withDefaults({
  dupPairs: [[100, 200]],
  name: 'eng-surf',
  org: 'Acme',
  selfLogin: 'me',
  watchedComments: [{ commentId: 11, pr: 1 }],
})

function emptyReport(): ScanReport {
  return {
    closedDups: [],
    errors: [],
    newItems: [],
    reactionChanges: [],
    replies: [],
  }
}

function item(over: Partial<ActivityItem>): ActivityItem {
  return {
    author: 'alice',
    createdAt: '2026-01-01T00:00:00Z',
    kind: 'pr',
    labels: [],
    number: 42,
    reason: 'open, no human review yet',
    repo: 'Acme/repo',
    title: 'add thing',
    updatedAt: '2026-01-02T00:00:00Z',
    url: 'https://x/42',
    ...over,
  }
}

test('empty report renders the all-quiet line', () => {
  const report = emptyReport()
  assert.equal(scanChanged(report), false)
  const line = renderReport(CONFIG, report)
  assert.match(line, /^SCAN: all quiet — heartbeat green, eng-surf:/)
  assert.match(line, /dup pair #100\/#200 still open/)
  assert.match(line, /board unchanged\.$/)
})

test('new items render as needs-review bullets under CHANGES', () => {
  const report = { ...emptyReport(), newItems: [item({})] }
  assert.equal(scanChanged(report), true)
  const out = renderReport(CONFIG, report)
  assert.match(out, /^SCAN: CHANGES/)
  assert.match(
    out,
    /needs review: Acme\/repo#42 \(pr\) add thing — open, no human review yet https:\/\/x\/42/,
  )
})

test('errors alone count as changed and never read as all-quiet', () => {
  const report = { ...emptyReport(), errors: ['search failed for `q`'] }
  assert.equal(scanChanged(report), true)
  const out = renderReport(CONFIG, report)
  assert.match(out, /^SCAN: CHANGES/)
  assert.match(out, /scan error: search failed/)
})

test("a reply quoting another user's review is flagged NOT-a-reply", () => {
  const report = {
    ...emptyReport(),
    replies: [
      {
        author: 'carol',
        body: 'the modal covers it',
        createdAt: '2026-01-03T00:00:00Z',
        pr: 1,
        quotedFrom: "bret's review",
        repo: 'Acme/repo',
        role: 'pr-author' as const,
      },
    ],
  }
  const out = renderReport(CONFIG, report)
  assert.match(out, /quotes bret's review/)
  assert.match(out, /NOT a reply to me/)
})

test('the digest never approves anything', () => {
  const out = renderReport(CONFIG, { ...emptyReport(), newItems: [item({})] })
  assert.ok(!/approve/i.test(out))
})
