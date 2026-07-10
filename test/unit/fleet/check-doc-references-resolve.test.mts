// vitest specs for check-doc-references-resolve.

import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { test } from 'vitest'

import {
  isWheelhouseOwnedRef,
  lineIsCrossRepoExempt,
  scanDoc,
  scanRepo,
} from '../../../scripts/fleet/check/doc-references-resolve.mts'

// ── isWheelhouseOwnedRef: scope filter ──────────────────────────

test('isWheelhouseOwnedRef accepts wheelhouse-owned trees only', () => {
  assert.equal(isWheelhouseOwnedRef('scripts/fleet/install-sfw.mts'), true)
  assert.equal(
    isWheelhouseOwnedRef('scripts/repo/sync-scaffolding/cli.mts'),
    true,
  )
  assert.equal(isWheelhouseOwnedRef('.claude/skills/fleet/x/run.mts'), true)
  // host-repo example paths a generic skill documents — NOT validated:
  assert.equal(isWheelhouseOwnedRef('scripts/test262.mts'), false)
  assert.equal(isWheelhouseOwnedRef('test/foo-runner.mts'), false)
  assert.equal(isWheelhouseOwnedRef('packages/x/build.mts'), false)
})

// ── scanDoc: line-level extraction ──────────────────────────────

function repoWith(files: Record<string, string>): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'doc-refs-'))
  for (const [rel, content] of Object.entries(files)) {
    const abs = path.join(dir, rel)
    mkdirSync(path.dirname(abs), { recursive: true })
    writeFileSync(abs, content)
  }
  return dir
}

test('scanDoc flags a wheelhouse-owned node-script ref whose file is missing', () => {
  const repo = repoWith({})
  const hits = scanDoc(
    's/SKILL.md',
    'Run `node scripts/fleet/gone.mts` to set up.',
    repo,
  )
  assert.equal(hits.length, 1)
  assert.equal(hits[0]!.scriptPath, 'scripts/fleet/gone.mts')
  assert.equal(hits[0]!.line, 1)
})

test('scanDoc passes a node-script ref that resolves', () => {
  const repo = repoWith({ 'scripts/fleet/here.mts': '// ok\n' })
  assert.equal(
    scanDoc('s/SKILL.md', 'node scripts/fleet/here.mts', repo).length,
    0,
  )
})

test('scanDoc skips a host-repo example path (not a wheelhouse tree)', () => {
  // A generic skill documents `scripts/test262.mts` — lives only in a consuming
  // repo, so it must NOT flag here even though it is absent.
  const repo = repoWith({})
  assert.equal(
    scanDoc('s/SKILL.md', 'node scripts/test262.mts --all', repo).length,
    0,
  )
})

test('scanDoc skips a cross-repo cascade instruction (marker on the cd line above)', () => {
  // The trimming-bundle SKILL incident: a `cd <…>/socket-wheelhouse && \n node
  // scripts/repo/sync-scaffolding/cli.mts …` echo block resolves in the
  // wheelhouse, not the member repo, and carries the canonical marker on the cd
  // line. The ref one line below must be exempt too.
  const repo = repoWith({})
  const text = [
    '  echo "  cd /Users/x/projects/socket-wheelhouse &&" # socket-lint: allow cross-repo',
    '  echo "  node scripts/repo/sync-scaffolding/cli.mts --target . --fix"',
  ].join('\n')
  assert.equal(scanDoc('s/SKILL.md', text, repo).length, 0)
})

test('scanDoc still flags a missing ref WITHOUT the cross-repo marker', () => {
  // The exemption must not over-reach: a plain missing wheelhouse-owned ref with
  // no marker on its line or the one above still fails.
  const repo = repoWith({})
  const text = [
    'prose with no marker here',
    'node scripts/repo/sync-scaffolding/cli.mts --target . --fix',
  ].join('\n')
  const hits = scanDoc('s/SKILL.md', text, repo)
  assert.equal(hits.length, 1)
  assert.equal(hits[0]!.line, 2)
})

test('lineIsCrossRepoExempt matches the marker on the ref line or one above', () => {
  const lines = [
    'cd /x/socket-wheelhouse && # socket-lint: allow cross-repo',
    'node scripts/repo/foo.mts', // exempt: marker on line above
    'plain prose, no marker',
    'node scripts/repo/baz.mts', // NOT exempt: line above is unmarked
    'node scripts/repo/bar.mts # socket-lint: allow cross-repo', // exempt: same line
  ]
  assert.equal(lineIsCrossRepoExempt(lines, 0), true) // marker on its own line
  assert.equal(lineIsCrossRepoExempt(lines, 1), true) // marker on line above
  assert.equal(lineIsCrossRepoExempt(lines, 2), false) // plain prose, no marker
  assert.equal(lineIsCrossRepoExempt(lines, 3), false) // line above unmarked
  assert.equal(lineIsCrossRepoExempt(lines, 4), true) // marker on same line
})

test('scanDoc extracts a path from a markdown table cell', () => {
  const repo = repoWith({})
  const row = '| `node scripts/fleet/setup/zizmor.mts` | Zizmor scanner |'
  const hits = scanDoc('s/SKILL.md', row, repo)
  assert.equal(hits.length, 1)
  assert.equal(hits[0]!.scriptPath, 'scripts/fleet/setup/zizmor.mts')
})

test('scanDoc finds a .claude/skills/<x>/run.mts ref', () => {
  const repo = repoWith({})
  const hits = scanDoc(
    'c/cmd.md',
    'node .claude/skills/auditing-gha/run.mts <owner/repo>',
    repo,
  )
  assert.equal(hits.length, 1)
  assert.equal(hits[0]!.scriptPath, '.claude/skills/auditing-gha/run.mts')
})

test('scanDoc reports a hit on each matching line', () => {
  const repo = repoWith({ 'scripts/fleet/ok.mts': '// ok\n' })
  const text = [
    'node scripts/fleet/ok.mts',
    'node scripts/fleet/missing-a.mts',
    'prose with no node ref',
    'node scripts/fleet/missing-b.mts',
  ].join('\n')
  const hits = scanDoc('s/SKILL.md', text, repo)
  assert.equal(hits.length, 2)
  assert.deepEqual(
    hits.map(h => h.line),
    [2, 4],
  )
})

test('scanDoc ignores non-node + bin-tool + node -e lines', () => {
  const repo = repoWith({})
  const text = [
    'oxfmt -c x --write .',
    'node -e "require(1)"',
    'pnpm run check',
    'see the /setup-repo command', // bare /command token — out of scope
    'cd /Users/x/projects/socket-wheelhouse && do-thing',
  ].join('\n')
  assert.equal(scanDoc('s/SKILL.md', text, repo).length, 0)
})

test('scanDoc handles two node refs on one line', () => {
  const repo = repoWith({ 'scripts/fleet/a.mts': '//\n' })
  const hits = scanDoc(
    's/SKILL.md',
    'node scripts/fleet/a.mts then node scripts/fleet/b.mts',
    repo,
  )
  assert.equal(hits.length, 1)
  assert.equal(hits[0]!.scriptPath, 'scripts/fleet/b.mts')
})

// ── scanRepo: walks the doc trees ───────────────────────────────

test('scanRepo walks SKILL.md + command .md and flags missing refs', () => {
  const repo = repoWith({
    '.claude/skills/fleet/foo/SKILL.md': 'node scripts/fleet/gone.mts',
    '.claude/commands/fleet/bar.md': 'node .claude/skills/fleet/foo/run.mts',
    'scripts/fleet/real.mts': '// ok\n',
  })
  const hits = scanRepo(repo)
  assert.equal(hits.length, 2)
  assert.ok(hits.some(h => h.doc.includes('SKILL.md')))
  assert.ok(hits.some(h => h.doc.includes('bar.md')))
})

test('scanRepo is clean when every doc ref resolves', () => {
  const repo = repoWith({
    '.claude/skills/fleet/foo/SKILL.md': 'node scripts/fleet/real.mts',
    'scripts/fleet/real.mts': '// ok\n',
  })
  assert.equal(scanRepo(repo).length, 0)
})

test('scanRepo ignores markdown outside the skill/command trees', () => {
  const repo = repoWith({
    'docs/random.md': 'node scripts/gone.mts', // not a skill/command doc
  })
  assert.equal(scanRepo(repo).length, 0)
})

test('scanRepo returns empty when the doc roots are absent', () => {
  const repo = mkdtempSync(path.join(os.tmpdir(), 'doc-refs-empty-'))
  assert.equal(scanRepo(repo).length, 0)
})
