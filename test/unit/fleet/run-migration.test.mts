// vitest specs for the migrating-rule-packs run-migration pure helpers:
// parseArgs (flag resolution + required-flag gate), slugForFile (worktree slug),
// and loadRulePack (concatenated rule context). The worktree-per-file migration
// loop + agent spawn are integration-level; these specs lock the deterministic
// arg parsing + rule loading.

import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { test } from 'vitest'

import {
  loadRulePack,
  parseArgs,
  slugForFile,
} from '../../../.claude/skills/fleet/migrating-rule-packs/lib/run-migration.mts'

function rulesDirWith(files: Readonly<Record<string, string>>): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'rule-pack-'))
  for (const [name, body] of Object.entries(files)) {
    writeFileSync(path.join(dir, name), body)
  }
  return dir
}

test('slugForFile produces a filesystem-safe slug', () => {
  assert.equal(
    slugForFile('packages/web/src/foo.ts'),
    'packages-web-src-foo-ts',
  )
  assert.equal(slugForFile('a/b.ts'), 'a-b-ts')
  // Leading/trailing separators are trimmed.
  assert.equal(slugForFile('/x/'), 'x')
})

test('parseArgs resolves required flags + defaults', () => {
  const rules = rulesDirWith({ 'rule.md': '# rule' })
  const args = parseArgs([
    '--name',
    'no-foo',
    '--rules',
    rules,
    '--survey',
    'foo\\(',
    '--scope',
    'packages',
    '--concurrency',
    '4',
    '--attempts',
    '2',
    '--dry-run',
  ])
  assert.equal(args.name, 'no-foo')
  assert.equal(args.rulesDir, rules)
  assert.equal(args.survey, 'foo\\(')
  assert.equal(args.scope, 'packages')
  assert.equal(args.concurrency, 4)
  assert.equal(args.attempts, 2)
  assert.equal(args.dryRun, true)
})

test('parseArgs clamps a negative concurrency/attempts to a floor of 1', () => {
  const rules = rulesDirWith({ 'rule.md': '# rule' })
  const args = parseArgs([
    '--name',
    'x',
    '--rules',
    rules,
    '--survey',
    'y',
    '--concurrency',
    '-2',
    '--attempts',
    '-3',
  ])
  // A negative parseInt is truthy, so it reaches Math.max(1, …) and clamps to 1.
  assert.equal(args.concurrency, 1)
  assert.equal(args.attempts, 1)
})

test('parseArgs falls back to the default for a zero/garbage concurrency', () => {
  const rules = rulesDirWith({ 'rule.md': '# rule' })
  const args = parseArgs([
    '--name',
    'x',
    '--rules',
    rules,
    '--survey',
    'y',
    '--concurrency',
    '0',
    '--attempts',
    'nope',
  ])
  // `0 || DEFAULT` and `NaN || DEFAULT` both fall through to the defaults
  // (concurrency 5, attempts 3), then Math.max(1, default) is the default.
  assert.equal(args.concurrency, 5)
  assert.equal(args.attempts, 3)
})

test('loadRulePack concatenates every *.md file, sorted, with a banner', () => {
  const rules = rulesDirWith({
    'b-rule.md': 'second',
    'a-rule.md': 'first',
    'notes.txt': 'ignored',
  })
  const pack = loadRulePack(rules)
  assert.ok(pack.includes('===== RULE FILE: a-rule.md ====='))
  assert.ok(pack.includes('===== RULE FILE: b-rule.md ====='))
  assert.ok(!pack.includes('notes.txt'))
  // a-rule sorts before b-rule.
  assert.ok(pack.indexOf('a-rule.md') < pack.indexOf('b-rule.md'))
})

test('loadRulePack reads the rule bodies', () => {
  const rules = rulesDirWith({ 'r.md': 'the body text' })
  assert.ok(loadRulePack(rules).includes('the body text'))
})

test('loadRulePack stages files under a fresh dir each call (isolation)', () => {
  mkdirSync(path.join(mkdtempSync(path.join(os.tmpdir(), 'rp-')), 'sub'), {
    recursive: true,
  })
  const a = rulesDirWith({ 'r.md': 'A' })
  const b = rulesDirWith({ 'r.md': 'B' })
  assert.ok(loadRulePack(a).includes('A'))
  assert.ok(loadRulePack(b).includes('B'))
})
