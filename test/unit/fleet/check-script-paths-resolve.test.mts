// vitest specs for check-script-paths-resolve.

import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { test } from 'vitest'

import {
  extractNodeScriptPath,
  scanRepo,
  scanScriptMap,
} from '../../../scripts/fleet/check/script-paths-resolve.mts'

// ── extractNodeScriptPath ───────────────────────────────────────

test('extractNodeScriptPath returns the path for a node <script> invocation', () => {
  assert.equal(extractNodeScriptPath('node scripts/foo.mts'), 'scripts/foo.mts')
  assert.equal(
    extractNodeScriptPath('node scripts/fleet/check/x.mts --quiet'),
    'scripts/fleet/check/x.mts',
  )
})

test('extractNodeScriptPath tolerates a leading NAME=val env prefix', () => {
  assert.equal(extractNodeScriptPath('FOO=1 node x.mts'), 'x.mts')
  assert.equal(extractNodeScriptPath('A=1 B=2 node a/b.cjs'), 'a/b.cjs')
})

test('extractNodeScriptPath accepts every local script extension', () => {
  for (const ext of ['.mts', '.cts', '.mjs', '.cjs', '.js']) {
    assert.equal(extractNodeScriptPath(`node f${ext}`), `f${ext}`)
  }
})

test('extractNodeScriptPath skips inline node -e / --eval', () => {
  assert.equal(extractNodeScriptPath('node -e "require(1)"'), undefined)
  assert.equal(extractNodeScriptPath('node --eval "x"'), undefined)
})

test('extractNodeScriptPath skips non-node commands', () => {
  assert.equal(extractNodeScriptPath('oxfmt -c x --write .'), undefined)
  // oxlint-disable-next-line socket/no-glob-in-ordered-run-s -- test fixture: asserts the check ignores non-node scripts.
  assert.equal(extractNodeScriptPath('run-s install:*'), undefined)
  assert.equal(extractNodeScriptPath('agent-ci run --all'), undefined)
  assert.equal(extractNodeScriptPath('pnpm exec tsgo'), undefined)
})

test('extractNodeScriptPath skips a node call whose first arg lacks a script ext', () => {
  // `node --version` / `node` with only flags → nothing to resolve.
  assert.equal(extractNodeScriptPath('node --version'), undefined)
  assert.equal(extractNodeScriptPath('node'), undefined)
})

// ── scanScriptMap ───────────────────────────────────────────────

function makeRepo(): string {
  return mkdtempSync(path.join(os.tmpdir(), 'script-paths-test-'))
}

function touch(repo: string, rel: string): void {
  const abs = path.join(repo, rel)
  mkdirSync(path.dirname(abs), { recursive: true })
  writeFileSync(abs, '// stub\n')
}

test('scanScriptMap flags a node path that does not resolve', () => {
  const repo = makeRepo()
  const hits = scanScriptMap(
    { 'doctor:auth': 'node scripts/fleet/check/gone.mts' },
    repo,
    'package.json',
  )
  assert.equal(hits.length, 1)
  assert.equal(hits[0]!.key, 'doctor:auth')
  assert.equal(hits[0]!.scriptPath, 'scripts/fleet/check/gone.mts')
  assert.equal(hits[0]!.source, 'package.json')
})

test('scanScriptMap passes a node path that resolves', () => {
  const repo = makeRepo()
  touch(repo, 'scripts/fleet/check/here.mts')
  const hits = scanScriptMap(
    { check: 'node scripts/fleet/check/here.mts' },
    repo,
    'package.json',
  )
  assert.equal(hits.length, 0)
})

test('scanScriptMap ignores non-node + inline-eval scripts', () => {
  const repo = makeRepo()
  const hits = scanScriptMap(
    {
      format: 'oxfmt -c x --write .',
      clean: 'node -e "require(1)"',
      // oxlint-disable-next-line socket/no-glob-in-ordered-run-s -- test fixture: scanScriptMap ignores non-node scripts.
      'install-all': 'run-s install:*',
    },
    repo,
    'package.json',
  )
  assert.equal(hits.length, 0)
})

test('scanScriptMap reports one hit per dangling script', () => {
  const repo = makeRepo()
  touch(repo, 'ok.mts')
  const hits = scanScriptMap(
    {
      a: 'node ok.mts',
      b: 'node missing-b.mts',
      c: 'node missing-c.mts',
    },
    repo,
    'package.json',
  )
  assert.equal(hits.length, 2)
  assert.deepEqual(hits.map(h => h.key).toSorted(), ['b', 'c'])
})

// ── scanRepo (live package.json) ────────────────────────────────

test('scanRepo flags a dangling path in package.json scripts', async () => {
  const repo = makeRepo()
  writeFileSync(
    path.join(repo, 'package.json'),
    JSON.stringify({ scripts: { 'doctor:auth': 'node scripts/gone.mts' } }),
  )
  const hits = await scanRepo(repo)
  assert.equal(hits.length, 1)
  assert.equal(hits[0]!.source, 'package.json')
  assert.equal(hits[0]!.key, 'doctor:auth')
})

test('scanRepo is clean when every package.json script resolves', async () => {
  const repo = makeRepo()
  touch(repo, 'scripts/run.mts')
  writeFileSync(
    path.join(repo, 'package.json'),
    JSON.stringify({ scripts: { go: 'node scripts/run.mts', f: 'oxfmt .' } }),
  )
  assert.equal((await scanRepo(repo)).length, 0)
})

test('scanRepo tolerates a missing / malformed package.json', async () => {
  const empty = makeRepo()
  assert.equal((await scanRepo(empty)).length, 0)
  const bad = makeRepo()
  writeFileSync(path.join(bad, 'package.json'), '{ not json')
  assert.equal((await scanRepo(bad)).length, 0)
})

test('scanRepo skips the manifest import when no manifest is present (downstream fleet repo)', async () => {
  // A repo with only a clean package.json and no scripts/repo/sync-scaffolding/
  // manifest.mts must not throw and must report no manifest hits.
  const repo = makeRepo()
  touch(repo, 'x.mts')
  writeFileSync(
    path.join(repo, 'package.json'),
    JSON.stringify({ scripts: { x: 'node x.mts' } }),
  )
  assert.equal((await scanRepo(repo)).length, 0)
})
