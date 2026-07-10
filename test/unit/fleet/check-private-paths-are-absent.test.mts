// vitest specs for check-private-paths-are-absent.

import assert from 'node:assert/strict'

import { test } from 'vitest'

import {
  matchPrivatePath,
  scanText,
} from '../../../scripts/fleet/check/private-paths-are-absent.mts'

// ── matchPrivatePath: the comment-body matcher ──────────────────

test('matchPrivatePath flags a .claude/plans path', () => {
  const hit = matchPrivatePath('see .claude/plans/foo.md')
  assert.ok(hit)
  assert.equal(hit.match, '.claude/plans/foo.md')
})

test('matchPrivatePath flags a .claude/reports path', () => {
  assert.ok(matchPrivatePath('in .claude/reports/audit.md'))
})

test('matchPrivatePath flags a cross-repo socket-<repo>/.claude path', () => {
  const hit = matchPrivatePath('from socket-acme/.claude/plans/x.md')
  assert.ok(hit)
  assert.equal(hit.match, 'socket-acme/.claude/plans/x.md')
})

test('matchPrivatePath flags an absolute /Users/<name>/ home path', () => {
  assert.ok(matchPrivatePath('built at /Users/acme/projects/foo')) // socket-lint: allow personal-path -- fixture exercises the matcher; the name is fictitious.
})

test('matchPrivatePath flags a ../socket-<repo>/ sibling path', () => {
  assert.ok(matchPrivatePath('mirrors ../socket-lib/src/index.mts'))
})

test('matchPrivatePath ignores a plain in-repo path', () => {
  assert.equal(matchPrivatePath('reads src/lib.mts here'), undefined)
})

test('matchPrivatePath ignores a bare ../ parent ref with no repo segment', () => {
  assert.equal(matchPrivatePath('import from ../guard.mts'), undefined)
})

// ── scanText: comment-scoped, with line numbers ─────────────────

test('scanText flags a private path in a // line comment', () => {
  const hits = scanText(
    'src/lib.rs',
    'fn main() {}\n// see .claude/plans/foo.md\n',
  )
  assert.equal(hits.length, 1)
  assert.equal(hits[0]!.line, 2)
})

test('scanText flags a private path inside a /* block */ comment', () => {
  const hits = scanText(
    'src/lib.rs',
    '/*\n * details in .claude/reports/x.md\n */\n',
  )
  assert.equal(hits.length, 1)
  assert.equal(hits[0]!.line, 2)
})

test('scanText does NOT flag a private path inside a string literal', () => {
  const hits = scanText('src/lib.mts', "const p = '.claude/plans/foo.md'\n")
  assert.equal(hits.length, 0)
})

test('scanText flags a # python line comment', () => {
  const hits = scanText('build.py', '# build dir ../socket-lib/dist\n')
  assert.equal(hits.length, 1)
})

// ── single-line /* … */ block (the motivating-incident shape) ───

test('scanText flags a single-line /* /Users/… */ home path in a .rs file', () => {
  const hits = scanText(
    'src/lib.rs',
    'fn main() {} /* built at /Users/acme/projects/foo */\n', // socket-lint: allow personal-path -- fixture exercises the matcher; the name is fictitious.
  )
  assert.equal(hits.length, 1)
  assert.equal(hits[0]!.kind, 'home-abs-path')
  assert.equal(hits[0]!.line, 1)
})

test('scanText flags a single-line /* socket-<repo>/.claude/plans/… */ in a .go file', () => {
  const hits = scanText(
    'main.go',
    'package main\n/* see socket-wheelhouse/.claude/plans/x.md */\n',
  )
  assert.equal(hits.length, 1)
  assert.equal(hits[0]!.kind, 'cross-repo-claude')
  assert.equal(hits[0]!.line, 2)
})

test('scanText flags a single-line /* ../socket-lib/… */ sibling ref in a .c file', () => {
  const hits = scanText('lib.c', '/* mirrors ../socket-lib/dist */\n')
  assert.equal(hits.length, 1)
  assert.equal(hits[0]!.kind, 'sibling-repo-rel')
  assert.equal(hits[0]!.line, 1)
})
