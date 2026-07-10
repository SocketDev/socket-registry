// vitest specs for check-pnpm-run-citations-resolve.

import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { test } from 'vitest'

import {
  readScriptNames,
  scanDoc,
  scanRepo,
  scriptExists,
  scriptPrefix,
} from '../../../scripts/fleet/check/pnpm-run-citations-resolve.mts'

// ── scriptPrefix ────────────────────────────────────────────────

test('scriptPrefix strips a trailing glob star', () => {
  assert.equal(scriptPrefix('build:*'), 'build:')
  assert.equal(scriptPrefix('cover*'), 'cover')
})

test('scriptPrefix keeps a trailing colon as a documented prefix', () => {
  assert.equal(scriptPrefix('build:'), 'build:')
})

test('scriptPrefix returns undefined for an exact name', () => {
  assert.equal(scriptPrefix('build'), undefined)
  assert.equal(scriptPrefix('ci:local'), undefined)
})

// ── scriptExists ────────────────────────────────────────────────

test('scriptExists matches an exact script name', () => {
  assert.equal(scriptExists('build', ['build', 'test']), true)
  assert.equal(scriptExists('gone', ['build', 'test']), false)
})

test('scriptExists matches a glob/colon prefix against any script', () => {
  assert.equal(scriptExists('build:*', ['build:lib', 'test']), true)
  assert.equal(scriptExists('build:', ['build:lib']), true)
  assert.equal(scriptExists('build:*', ['test']), false)
})

// ── scanDoc ─────────────────────────────────────────────────────

const SCRIPTS = ['build', 'check', 'check:paths', 'test', 'test:cover']

test('scanDoc flags a pnpm run citation with no matching script', () => {
  const hits = scanDoc(
    'SKILL.md',
    'Run `pnpm run dedup-scan` to start.',
    SCRIPTS,
  )
  assert.equal(hits.length, 1)
  assert.equal(hits[0]!.scriptName, 'dedup-scan')
  assert.equal(hits[0]!.line, 1)
  assert.equal(hits[0]!.doc, 'SKILL.md')
})

test('scanDoc passes an exact and a prefix citation', () => {
  const text = ['First `pnpm run build`.', 'Then `pnpm run test:cover`.'].join(
    '\n',
  )
  assert.equal(scanDoc('SKILL.md', text, SCRIPTS).length, 0)
})

test('scanDoc passes a glob/colon prefix citation', () => {
  assert.equal(scanDoc('s.md', 'pnpm run check:* runs all.', SCRIPTS).length, 0)
  assert.equal(scanDoc('s.md', 'the pnpm run test: family.', SCRIPTS).length, 0)
})

test('scanDoc skips an allowed-tools frontmatter permission line', () => {
  const text = 'allowed-tools: Bash(pnpm run cover:*), Bash(pnpm run nope:*)'
  assert.equal(scanDoc('SKILL.md', text, SCRIPTS).length, 0)
})

test('scanDoc skips metasyntactic placeholder names', () => {
  const text = 'scripts named `pnpm run foo --flag`, e.g. `pnpm run bar`.'
  assert.equal(scanDoc('s.md', text, SCRIPTS).length, 0)
})

test('scanDoc finds multiple citations on one line', () => {
  const text = 'do `pnpm run a` then `pnpm run b`'
  const hits = scanDoc('s.md', text, SCRIPTS)
  assert.deepEqual(hits.map(h => h.scriptName).toSorted(), ['a', 'b'])
})

// ── readScriptNames + scanRepo ──────────────────────────────────

function makeRepo(): string {
  return mkdtempSync(path.join(os.tmpdir(), 'skills-cite-test-'))
}

function write(repo: string, rel: string, body: string): void {
  const abs = path.join(repo, rel)
  mkdirSync(path.dirname(abs), { recursive: true })
  writeFileSync(abs, body)
}

test('readScriptNames returns the package.json script keys', () => {
  const repo = makeRepo()
  write(repo, 'package.json', JSON.stringify({ scripts: { a: 'x', b: 'y' } }))
  assert.deepEqual(readScriptNames(repo).toSorted(), ['a', 'b'])
})

test('readScriptNames tolerates a missing / malformed package.json', () => {
  assert.deepEqual(readScriptNames(makeRepo()), [])
  const bad = makeRepo()
  write(bad, 'package.json', '{ not json')
  assert.deepEqual(readScriptNames(bad), [])
})

test('scanRepo flags a dangling pnpm run citation across doc roots', () => {
  const repo = makeRepo()
  write(repo, 'package.json', JSON.stringify({ scripts: { build: 'x' } }))
  write(repo, '.claude/skills/fleet/foo/SKILL.md', 'Run `pnpm run gone`.')
  write(repo, '.claude/skills/fleet/foo/reference.md', '`pnpm run also-gone`')
  write(repo, '.claude/commands/fleet/bar.md', '`pnpm run third-gone`')
  const hits = scanRepo(repo)
  assert.deepEqual(hits.map(h => h.scriptName).toSorted(), [
    'also-gone',
    'gone',
    'third-gone',
  ])
})

test('scanRepo is clean when every citation resolves', () => {
  const repo = makeRepo()
  write(
    repo,
    'package.json',
    JSON.stringify({ scripts: { build: 'x', 'test:cover': 'y' } }),
  )
  write(repo, '.claude/skills/fleet/foo/SKILL.md', '`pnpm run build`')
  write(repo, '.claude/commands/fleet/bar.md', '`pnpm run test:cover`')
  assert.equal(scanRepo(repo).length, 0)
})
