import assert from 'node:assert/strict'

import { test } from 'vitest'

import { runScan } from '../../../../scripts/fleet/team-activity/lib/scan.mts'
import { withDefaults } from '../../../../scripts/fleet/team-activity/lib/config.mts'
import type {
  GhRunner,
  ScanState,
} from '../../../../scripts/fleet/team-activity/lib/types.mts'

const CONFIG = withDefaults({
  authors: ['alice'],
  name: 'eng-surf',
  org: 'Acme',
  selfLogin: 'me',
})

function freshState(): ScanState {
  return { reactions: {}, scannedAt: '2026-07-07T00:00:00Z' }
}

function searchLine(over: {
  isPr: boolean
  login?: string
  number: number
}): string {
  return JSON.stringify({
    createdAt: '2026-01-01T00:00:00Z',
    draft: false,
    isPr: over.isPr,
    labels: [],
    login: over.login ?? 'alice',
    number: over.number,
    repo: 'Acme/repo',
    title: `t${over.number}`,
    updatedAt: '2026-01-02T00:00:00Z',
    url: `https://x/${over.number}`,
  })
}

// One runner for the whole pass: search discovery, the per-item review-state
// fetch, and (unused here) follow-up routes.
const gh: GhRunner = args => {
  const joined = args.join(' ')
  if (joined.includes('search/issues')) {
    return [
      searchLine({ isPr: true, number: 7 }),
      searchLine({ isPr: true, login: 'dependabot[bot]', number: 8 }),
      searchLine({ isPr: false, number: 9 }),
    ].join('\n')
  }
  if (joined.includes('pr view') || joined.includes('issue view')) {
    return JSON.stringify({ commenters: [], decision: '', reviewers: [] })
  }
  return undefined
}

test('runScan surfaces open PRs and issues, dependabot skipped, sorted', () => {
  const report = runScan(CONFIG, freshState(), gh)
  assert.deepEqual(
    report.newItems.map(i => `${i.repo}#${i.number}(${i.kind})`),
    ['Acme/repo#7(pr)', 'Acme/repo#9(issue)'],
  )
  assert.equal(report.errors.length, 0)
})

test('runScan collects errors loud when discovery fails', () => {
  const report = runScan(CONFIG, freshState(), () => undefined)
  assert.ok(report.errors.length > 0)
})
