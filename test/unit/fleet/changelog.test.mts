// vitest specs for the release CHANGELOG generation lib.

import assert from 'node:assert/strict'

import { test } from 'vitest'

import {
  bumpLevelFor,
  COMMIT_FIELD_SEP,
  COMMIT_RECORD_SEP,
  computeNextVersion,
  generateChangelogSection,
  parseCommit,
  parseConventionalCommits,
  repoBaseUrl,
  versionHintFrom,
} from '../../../scripts/fleet/lib/changelog.mts'
import type { ConventionalCommit } from '../../../scripts/fleet/lib/changelog.mts'

// ── parseCommit ─────────────────────────────────────────────────

test('parses a scoped feat subject', () => {
  const c = parseCommit('abc', 'feat(ai): add billing-context', '')
  assert.deepEqual(c, {
    breaking: false,
    description: 'add billing-context',
    hash: 'abc',
    scope: 'ai',
    type: 'feat',
  })
})

test('parses a scopeless fix subject', () => {
  const c = parseCommit('def', 'fix: handle empty input', '')
  assert.equal(c?.type, 'fix')
  assert.equal(c?.scope, undefined)
  assert.equal(c?.breaking, false)
})

test('a `!` before the colon marks a breaking change', () => {
  const c = parseCommit('a', 'feat(api)!: drop the v1 surface', '')
  assert.equal(c?.breaking, true)
})

test('a BREAKING CHANGE body line marks a breaking change', () => {
  const c = parseCommit(
    'a',
    'feat(api): rework auth',
    'BREAKING CHANGE: tokens rotate',
  )
  assert.equal(c?.breaking, true)
})

test('a non-conventional subject is skipped (undefined)', () => {
  assert.equal(parseCommit('a', 'Merge branch main', ''), undefined)
  assert.equal(parseCommit('a', 'wip stuff', ''), undefined)
})

// ── parseConventionalCommits ────────────────────────────────────

test('parses a git-log stream, dropping non-conforming records', () => {
  const raw = [
    `h1${COMMIT_FIELD_SEP}feat(x): one${COMMIT_FIELD_SEP}`,
    `h2${COMMIT_FIELD_SEP}chore: noise${COMMIT_FIELD_SEP}`,
    `h3${COMMIT_FIELD_SEP}Merge pull request${COMMIT_FIELD_SEP}`,
  ].join(COMMIT_RECORD_SEP)
  const commits = parseConventionalCommits(raw)
  assert.deepEqual(
    commits.map(c => c.type),
    ['feat', 'chore'],
  )
})

// ── bumpLevelFor ────────────────────────────────────────────────

const mk = (type: string, breaking = false): ConventionalCommit => ({
  breaking,
  description: 'x',
  hash: 'h',
  scope: undefined,
  type,
})

test('any breaking change → major', () => {
  assert.equal(bumpLevelFor([mk('fix'), mk('feat', true)]), 'major')
})

test('a feature (no breaking) → minor', () => {
  assert.equal(bumpLevelFor([mk('fix'), mk('feat'), mk('chore')]), 'minor')
})

test('only fix/perf → patch', () => {
  assert.equal(bumpLevelFor([mk('fix'), mk('perf')]), 'patch')
})

test('only internal types → undefined (nothing user-visible)', () => {
  assert.equal(bumpLevelFor([mk('chore'), mk('ci'), mk('docs')]), undefined)
})

// ── computeNextVersion ──────────────────────────────────────────

test('computeNextVersion bumps the right component and zeros the rest', () => {
  assert.equal(computeNextVersion('6.0.9', 'major'), '7.0.0')
  assert.equal(computeNextVersion('6.0.9', 'minor'), '6.1.0')
  assert.equal(computeNextVersion('6.0.9', 'patch'), '6.0.10')
})

test('computeNextVersion drops a prerelease/build suffix', () => {
  assert.equal(computeNextVersion('7.0.1-rc.2', 'patch'), '7.0.2')
})

// ── repoBaseUrl ─────────────────────────────────────────────────

test('repoBaseUrl normalizes git+https and ssh forms', () => {
  assert.equal(
    repoBaseUrl('git+https://github.com/SocketDev/socket-lib.git'),
    'https://github.com/SocketDev/socket-lib',
  )
  assert.equal(
    repoBaseUrl('git@github.com:SocketDev/socket-lib.git'),
    'https://github.com/SocketDev/socket-lib',
  )
  assert.equal(repoBaseUrl(undefined), undefined)
  assert.equal(repoBaseUrl('https://example.com/x'), undefined)
})

// ── generateChangelogSection ────────────────────────────────────

test('generates a linked heading + grouped sections, omitting internal commits', () => {
  const section = generateChangelogSection({
    commits: [
      mk('feat'),
      { ...mk('fix'), scope: 'parser', description: 'handle EOF' },
      mk('chore'),
    ],
    date: '2026-06-21',
    repoUrl: 'https://github.com/SocketDev/socket-lib',
    version: '6.1.0',
  })
  assert.match(
    section,
    /^## \[6\.1\.0\]\(https:\/\/github\.com\/SocketDev\/socket-lib\/releases\/tag\/v6\.1\.0\) - 2026-06-21/,
  )
  assert.match(section, /### Added/)
  assert.match(section, /### Fixed/)
  assert.match(section, /\*\*`parser`\*\* — handle EOF/)
  // chore is internal → never appears.
  assert.doesNotMatch(section, /chore/)
})

test('a breaking bullet is marked, and a repo-less heading omits the link', () => {
  const section = generateChangelogSection({
    commits: [{ ...mk('feat', true), description: 'drop v1' }],
    date: '2026-06-21',
    repoUrl: undefined,
    version: '7.0.0',
  })
  assert.match(section, /^## 7\.0\.0 - 2026-06-21/)
  assert.match(section, /\*\*BREAKING:\*\* drop v1/)
})

test('a breaking commit of an unmapped type still lands, under Changed', () => {
  // refactor!/chore! carry user-visible breakage even though their types are
  // internal churn — a `!` can never vanish from the CHANGELOG.
  const section = generateChangelogSection({
    commits: [
      { ...mk('refactor', true), description: 'remove the ./errors alias' },
    ],
    date: '2026-07-09',
    repoUrl: undefined,
    version: '7.0.0',
  })
  assert.match(section, /### Changed/)
  assert.match(section, /\*\*BREAKING:\*\* remove the \.\/errors alias/)
})

test('versionHintFrom extracts the base from a prerelease-suffixed version', () => {
  assert.equal(versionHintFrom('6.0.10-prerelease'), '6.0.10')
  assert.equal(versionHintFrom('6.0.10-rc.1'), '6.0.10')
})

test('versionHintFrom yields undefined for a plain release version', () => {
  assert.equal(versionHintFrom('6.0.9'), undefined)
})
