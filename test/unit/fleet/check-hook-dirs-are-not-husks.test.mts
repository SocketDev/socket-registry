// vitest specs for check-hook-dirs-are-not-husks.

import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { test } from 'vitest'

import {
  isHusk,
  scanHookDirs,
} from '../../../scripts/fleet/check/hook-dirs-are-not-husks.mts'

// ── isHusk: the per-dir predicate ───────────────────────────────

function makeDir(files: string[]): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'husk-dir-'))
  for (let i = 0, { length } = files; i < length; i += 1) {
    const abs = path.join(dir, files[i]!)
    mkdirSync(path.dirname(abs), { recursive: true })
    writeFileSync(abs, '')
  }
  return dir
}

test('isHusk: true for a dir holding only node_modules', () => {
  assert.equal(isHusk(makeDir(['node_modules/.keep'])), true)
})

test('isHusk: true for an empty dir', () => {
  assert.equal(isHusk(makeDir([])), true)
})

test('isHusk: false when index.mts is present', () => {
  assert.equal(isHusk(makeDir(['index.mts', 'node_modules/.keep'])), false)
})

test('isHusk: false when install.mts is present (setup-* hooks)', () => {
  assert.equal(isHusk(makeDir(['install.mts'])), false)
})

test('isHusk: false when only README.md is present (doc-only entry)', () => {
  assert.equal(isHusk(makeDir(['README.md'])), false)
})

// ── scanHookDirs: temp-repo fixtures ────────────────────────────

function makeRepo(): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'husk-repo-'))
  mkdirSync(path.join(dir, '.claude', 'hooks', 'fleet'), { recursive: true })
  mkdirSync(path.join(dir, '.claude', 'hooks', 'repo'), { recursive: true })
  return dir
}

function hookDir(
  dir: string,
  seg: string,
  name: string,
  files: string[],
): void {
  const base = path.join(dir, '.claude', 'hooks', seg, name)
  if (files.length === 0) {
    mkdirSync(base, { recursive: true })
    return
  }
  for (let i = 0, { length } = files; i < length; i += 1) {
    const abs = path.join(base, files[i]!)
    mkdirSync(path.dirname(abs), { recursive: true })
    writeFileSync(abs, '')
  }
}

test('scanHookDirs flags a node_modules-only husk', () => {
  const dir = makeRepo()
  hookDir(dir, 'fleet', 'left-over-guard', ['node_modules/.keep'])
  hookDir(dir, 'fleet', 'real-guard', ['index.mts'])
  const hits = scanHookDirs(dir)
  assert.equal(hits.length, 1)
  assert.ok(hits[0]!.dir.includes('left-over-guard'))
})

test('scanHookDirs flags an empty hook dir', () => {
  const dir = makeRepo()
  hookDir(dir, 'repo', 'empty-guard', [])
  const hits = scanHookDirs(dir)
  assert.equal(hits.length, 1)
  assert.ok(hits[0]!.dir.includes('empty-guard'))
})

test('scanHookDirs accepts index / install / README dirs', () => {
  const dir = makeRepo()
  hookDir(dir, 'fleet', 'a-guard', ['index.mts'])
  hookDir(dir, 'fleet', 'setup-x', ['install.mts'])
  hookDir(dir, 'repo', 'doc-only', ['README.md'])
  assert.equal(scanHookDirs(dir).length, 0)
})

test('scanHookDirs exempts _shared (a helper lib, not a hook)', () => {
  const dir = makeRepo()
  // _shared with no marker file would look like a husk, but it is exempt.
  hookDir(dir, 'fleet', '_shared', ['node_modules/.keep'])
  assert.equal(scanHookDirs(dir).length, 0)
})

test('scanHookDirs returns empty when the hooks dir is absent', () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'husk-none-'))
  assert.equal(scanHookDirs(dir).length, 0)
})
