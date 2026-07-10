// vitest specs for check-env-kill-switches-are-absent.

import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { test } from 'vitest'

import {
  collectHookFiles,
  scanHooks,
  scanText,
} from '../../../scripts/fleet/check/env-kill-switches-are-absent.mts'

// ── scanText: the pattern matcher ───────────────────────────────

test('scanText flags a functional process.env[...DISABLED] read', () => {
  const hits = scanText(
    'h/index.mts',
    "if (process.env['SOCKET_FOO_GUARD_DISABLED']) { process.exit(0) }",
  )
  assert.equal(hits.length, 1)
  assert.equal(hits[0]!.line, 1)
})

test('scanText flags a disabledEnvVar config field', () => {
  assert.equal(
    scanText('h/index.mts', "  disabledEnvVar: 'SOCKET_X'").length,
    1,
  )
})

test('scanText flags an isHookDisabled() call', () => {
  assert.equal(
    scanText('h/index.mts', '  if (isHookDisabled("x")) return').length,
    1,
  )
})

test('scanText flags a BARE SOCKET_*_DISABLED token in a comment (strict)', () => {
  const hits = scanText(
    'h/index.mts',
    '// Disable via SOCKET_BAR_REMINDER_DISABLED.',
  )
  assert.equal(hits.length, 1)
})

test('scanText flags a SOCKET_*_DISABLED token in an stderr message string', () => {
  const hits = scanText('h/index.mts', "  '  Disable: SOCKET_BAZ_DISABLED=1',")
  assert.equal(hits.length, 1)
})

test('scanText flags a SOCKET_*_DISABLED mention in README prose', () => {
  assert.equal(
    scanText('h/README.md', 'Bypass: set `SOCKET_QUX_GUARD_DISABLED=1`.')
      .length,
    1,
  )
})

test('scanText counts one hit per line, not per pattern', () => {
  // A line that matches both the bare token AND the process.env read counts once.
  const hits = scanText(
    'h/index.mts',
    "if (process.env['SOCKET_X_DISABLED']) {}",
  )
  assert.equal(hits.length, 1)
})

test('scanText reports a hit on each matching line across many lines', () => {
  const src = [
    'line one clean',
    '// SOCKET_A_DISABLED',
    'also clean',
    "process.env['SOCKET_B_DISABLED']",
  ].join('\n')
  const hits = scanText('h/index.mts', src)
  assert.equal(hits.length, 2)
  assert.deepEqual(
    hits.map(h => h.line),
    [2, 4],
  )
})

test('scanText passes clean text + the canonical bypass phrase', () => {
  assert.equal(
    scanText('h/index.mts', 'const BYPASS = "Allow foo bypass"').length,
    0,
  )
  assert.equal(scanText('h/README.md', 'Bypass: "Allow foo bypass".').length, 0)
  // A SOCKET_ env var that is NOT a *_DISABLED kill-switch is fine.
  assert.equal(
    scanText('h/index.mts', "process.env['SOCKET_API_TOKEN']").length,
    0,
  )
  assert.equal(scanText('h/index.mts', "process.env['FLEET_SYNC']").length, 0)
})

// ── temp-repo fixtures: collectHookFiles + scanHooks ────────────

function makeRepo(): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'kill-switch-test-'))
  mkdirSync(path.join(dir, '.claude', 'hooks', 'fleet'), { recursive: true })
  mkdirSync(path.join(dir, '.claude', 'hooks', 'repo'), { recursive: true })
  return dir
}

function hook(
  dir: string,
  seg: string,
  name: string,
  files: Record<string, string>,
): void {
  const d = path.join(dir, '.claude', 'hooks', seg, name)
  mkdirSync(path.join(d, 'test'), { recursive: true })
  for (const [rel, content] of Object.entries(files)) {
    const abs = path.join(d, rel)
    mkdirSync(path.dirname(abs), { recursive: true })
    writeFileSync(abs, content)
  }
}

test('collectHookFiles gathers index/README/test, skips other files', () => {
  const dir = makeRepo()
  hook(dir, 'fleet', 'foo-guard', {
    'index.mts': '// hook\n',
    'README.md': '# foo\n',
    'package.json': '{}',
    'test/index.test.mts': "test('x', () => {})\n",
  })
  const files = collectHookFiles(path.join(dir, '.claude', 'hooks', 'fleet'))
  const bases = files.map(f => path.basename(f)).toSorted()
  assert.deepEqual(bases, ['README.md', 'index.mts', 'index.test.mts'])
})

test('scanHooks flags a kill-switch in any of index / README / test', () => {
  const dir = makeRepo()
  hook(dir, 'fleet', 'a-guard', {
    'index.mts': "if (process.env['SOCKET_A_GUARD_DISABLED']) {}\n",
  })
  hook(dir, 'fleet', 'b-guard', {
    'index.mts': '// clean\n',
    'README.md': 'Bypass: SOCKET_B_GUARD_DISABLED=1.\n',
  })
  hook(dir, 'repo', 'c-guard', {
    'index.mts': '// clean\n',
    'test/index.test.mts':
      "test('respects SOCKET_C_GUARD_DISABLED', () => {})\n",
  })
  const hits = scanHooks(dir)
  // hit dirnames: a-guard (index), b-guard (README), c-guard's test/ dir
  assert.equal(hits.length, 3)
  assert.ok(hits.some(h => h.file.includes('a-guard')))
  assert.ok(hits.some(h => h.file.includes('b-guard')))
  assert.ok(hits.some(h => h.file.includes('c-guard')))
})

test('scanHooks is clean when no hook names a kill-switch', () => {
  const dir = makeRepo()
  hook(dir, 'fleet', 'clean-guard', {
    'index.mts': 'const BYPASS = "Allow clean bypass"\n',
    'README.md': 'Bypass: "Allow clean bypass".\n',
    'test/index.test.mts': "test('blocks', () => {})\n",
  })
  assert.equal(scanHooks(dir).length, 0)
})

test('scanHooks self-exempts the no-env-kill-switch-guard dir', () => {
  const dir = makeRepo()
  // This hook legitimately names the patterns it bans.
  hook(dir, 'fleet', 'no-env-kill-switch-guard', {
    'index.mts': 'const P = /SOCKET_[A-Z]*_DISABLED/\n',
    'README.md': 'Bans disabledEnvVar / SOCKET_*_DISABLED.\n',
  })
  assert.equal(scanHooks(dir).length, 0)
})

test('scanHooks returns empty when the hooks dir is absent', () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'kill-switch-empty-'))
  assert.equal(scanHooks(dir).length, 0)
})
