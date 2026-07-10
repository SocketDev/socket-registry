import assert from 'node:assert/strict'

import { test } from 'vitest'

import {
  buildSearchQuery,
  discoverCandidates,
  planQueries,
  runSearch,
} from '../../../../scripts/fleet/team-activity/lib/discover.mts'
import { withDefaults } from '../../../../scripts/fleet/team-activity/lib/config.mts'
import type { GhRunner } from '../../../../scripts/fleet/team-activity/lib/types.mts'

interface ItemInput {
  draft?: boolean
  labels?: string[]
  login?: string
  number: number
  repo?: string
  url?: string
}

function line(item: ItemInput): string {
  return JSON.stringify({
    createdAt: '2026-01-01T00:00:00Z',
    draft: item.draft ?? false,
    isPr: true,
    labels: item.labels ?? [],
    login: item.login ?? 'alice',
    number: item.number,
    repo: item.repo ?? 'ExampleOrg/repo',
    title: `item ${item.number}`,
    updatedAt: '2026-01-02T00:00:00Z',
    url: item.url ?? `https://github.com/ExampleOrg/repo/pull/${item.number}`,
  })
}

// A gh that serves fixed pages of search lines, keyed by the `page=N` arg.
function ghPages(pages: readonly string[][]): GhRunner {
  return args => {
    if (!args.join(' ').includes('search/issues')) {
      return undefined
    }
    const pageArg = args.find(a => a.startsWith('page='))
    const page = Number(pageArg?.slice('page='.length) ?? '1')
    return (pages[page - 1] ?? []).join('\n')
  }
}

test('buildSearchQuery scopes by repo list or org and adds qualifiers', () => {
  assert.equal(
    buildSearchQuery({ kind: 'pr', org: 'Acme', repos: [] }),
    'org:Acme type:pr state:open',
  )
  assert.equal(
    buildSearchQuery({
      author: 'alice',
      kind: 'issue',
      org: 'Acme',
      repos: ['Acme/a', 'Acme/b'],
    }),
    'repo:Acme/a repo:Acme/b type:issue state:open author:alice',
  )
  assert.equal(
    buildSearchQuery({ kind: 'pr', label: 'team-x', org: 'Acme', repos: [] }),
    'org:Acme type:pr state:open label:"team-x"',
  )
})

test('planQueries fans out author x kind and label x kind, sorted + deduped', () => {
  const config = withDefaults({
    authors: ['alice', 'bob'],
    labels: ['team-x'],
    name: 'w',
    org: 'Acme',
    selfLogin: 'me',
  })
  const queries = planQueries(config)
  // 2 authors x 2 kinds + 1 label x 2 kinds = 6 distinct.
  assert.equal(queries.length, 6)
  assert.deepEqual(queries, [...queries].toSorted())
  assert.ok(
    queries.some(q => q.includes('author:alice') && q.includes('type:pr')),
  )
  assert.ok(
    queries.some(q => q.includes('label:"team-x"') && q.includes('type:issue')),
  )
})

test('planQueries honors includeIssues:false (PRs only)', () => {
  const config = withDefaults({
    authors: ['alice'],
    includeIssues: false,
    name: 'w',
    org: 'Acme',
    selfLogin: 'me',
  })
  const queries = planQueries(config)
  assert.equal(queries.length, 1)
  assert.ok(queries[0]!.includes('type:pr'))
})

test('runSearch paginates until a short page and returns no error', () => {
  const fullPage = Array.from({ length: 100 }, (_, i) =>
    line({ number: i + 1 }),
  )
  const shortPage = Array.from({ length: 30 }, (_, i) =>
    line({ number: 200 + i }),
  )
  const result = runSearch(ghPages([fullPage, shortPage]), 'q')
  assert.equal(result.candidates.length, 130)
  assert.equal(result.error, undefined)
})

test('runSearch reports the 1000-result cap LOUD instead of truncating silently', () => {
  const fullPage = Array.from({ length: 100 }, (_, i) =>
    line({ number: i + 1 }),
  )
  const pages = Array.from({ length: 10 }, () => fullPage)
  const result = runSearch(ghPages(pages), 'q')
  assert.equal(result.candidates.length, 1000)
  assert.match(result.error ?? '', /1000-result search cap/)
})

test('runSearch surfaces a gh failure as an error, not empty-success', () => {
  const result = runSearch(() => undefined, 'q')
  assert.equal(result.candidates.length, 0)
  assert.match(result.error ?? '', /search failed/)
})

test('discoverCandidates dedupes by URL and drops bot authors and drafts', () => {
  const config = withDefaults({
    authors: ['alice'],
    name: 'w',
    org: 'ExampleOrg',
    selfLogin: 'me',
    skipBots: true,
  })
  // Same URL served across every fanned-out query -> deduped to one; a
  // dependabot-authored item and a draft are dropped.
  const gh: GhRunner = args =>
    args.join(' ').includes('search/issues')
      ? [
          line({ number: 7, url: 'https://x/7' }),
          line({ login: 'dependabot[bot]', number: 8, url: 'https://x/8' }),
          line({ draft: true, number: 9, url: 'https://x/9' }),
        ].join('\n')
      : undefined
  const result = discoverCandidates(config, gh)
  assert.deepEqual(result.candidates.map(c => c.url).toSorted(), [
    'https://x/7',
  ])
  assert.equal(result.errors.length, 0)
})
