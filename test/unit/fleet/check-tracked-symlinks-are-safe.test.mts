// vitest specs for the tracked-symlinks-are-safe classifier.

import assert from 'node:assert/strict'

import { test } from 'vitest'

import { classifyTrackedSymlink } from '../../../scripts/fleet/lib/self-referential-symlink.mts'

const ROOT = '/Users/x/projects/repo'

// ── the exact incident ──────────────────────────────────────────

test('flags a node_modules symlink pointing at the repo-absolute node_modules (the ELOOP incident)', () => {
  const bad = classifyTrackedSymlink(
    'node_modules',
    `${ROOT}/node_modules`,
    ROOT,
  )
  assert.ok(bad)
  assert.equal(bad!.linkPath, 'node_modules')
})

test('flags a tracked node_modules regardless of target (it is gitignored)', () => {
  assert.ok(classifyTrackedSymlink('node_modules', 'node_modules', ROOT))
  assert.ok(classifyTrackedSymlink('pkg/node_modules', '../node_modules', ROOT))
})

// ── self-referential + repo-internal-absolute ───────────────────

test('flags a self-referential symlink (target resolves to its own path)', () => {
  const bad = classifyTrackedSymlink('a/b', `${ROOT}/a/b`, ROOT)
  assert.ok(bad)
  assert.match(bad!.reason, /self-referential/)
})

test('flags an absolute target inside the repo (should be relative)', () => {
  const bad = classifyTrackedSymlink('a/b', `${ROOT}/c/d`, ROOT)
  assert.ok(bad)
  assert.match(bad!.reason, /absolute path inside the repo/)
})

// ── safe links pass ─────────────────────────────────────────────

test('allows a relative symlink pointing outside its own subtree', () => {
  assert.equal(
    classifyTrackedSymlink('docs/link', '../README.md', ROOT),
    undefined,
  )
})

test('allows an absolute symlink OUTSIDE the repo (e.g. a system path)', () => {
  assert.equal(
    classifyTrackedSymlink('x', '/usr/local/bin/tool', ROOT),
    undefined,
  )
})

test('allows a plain relative link', () => {
  assert.equal(classifyTrackedSymlink('foo', 'bar/baz', ROOT), undefined)
})

// ── win32 separator normalization ───────────────────────────────

test('normalizes backslash separators before classifying', () => {
  const bad = classifyTrackedSymlink('a\\b', `${ROOT}/a/b`, ROOT)
  assert.ok(bad)
})
