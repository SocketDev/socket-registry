// vitest spec for check-run-s-globs-are-explicit — the pure `scan` detector.
// The git-ls-files orchestration (main) is covered by the check running in
// `check --all`; these tests exercise the detection and annotation logic only.

import assert from 'node:assert/strict'

import { test } from 'vitest'

import { scan } from '../../../scripts/fleet/check/run-s-globs-are-explicit.mts'

const FILE = '/repo/package.json'

test('clean file with no scripts — no findings', () => {
  assert.deepEqual(scan(FILE, '{ "name": "pkg" }'), [])
})

test('explicit task list (no glob) — no findings', () => {
  const raw = JSON.stringify({
    scripts: {
      gen: 'run-s gen:logo gen:socket-icon gen:showcase',
    },
  })
  assert.deepEqual(scan(FILE, raw), [])
})

test('run-s colon-star glob — one finding', () => {
  // oxlint-disable-next-line socket/no-glob-in-ordered-run-s -- test fixture: scan() input data, not an executable aggregator.
  const raw = `{\n  "scripts": {\n    "gen": "run-s gen:*"\n  }\n}`
  const findings = scan(FILE, raw)
  assert.equal(findings.length, 1)
  assert.equal(findings[0]!.scriptKey, 'gen')
  // oxlint-disable-next-line socket/no-glob-in-ordered-run-s -- assertion on the fixture's literal value.
  assert.ok(findings[0]!.value.includes('run-s gen:*'))
})

test('run-p colon-star glob — one finding', () => {
  // oxlint-disable-next-line socket/no-glob-in-ordered-run-s -- test fixture: scan() input data, not an executable aggregator.
  const raw = `{\n  "scripts": {\n    "lint": "run-p lint:*"\n  }\n}`
  const findings = scan(FILE, raw)
  assert.equal(findings.length, 1)
  assert.equal(findings[0]!.scriptKey, 'lint')
})

test('multiple glob aggregators — multiple findings', () => {
  const raw = [
    '{',
    '  "scripts": {',
    // oxlint-disable-next-line socket/no-glob-in-ordered-run-s -- test fixture: scan() input data, not an executable aggregator.
    '    "gen": "run-s gen:*",',
    // oxlint-disable-next-line socket/no-glob-in-ordered-run-s -- test fixture: scan() input data, not an executable aggregator.
    '    "setup": "run-s setup:*"',
    '  }',
    '}',
  ].join('\n')
  const findings = scan(FILE, raw)
  assert.equal(findings.length, 2)
})

test('// order-independent annotation on same line clears the finding', () => {
  // oxlint-disable-next-line socket/no-glob-in-ordered-run-s -- test fixture: scan() input data, not an executable aggregator.
  const raw = `{\n  "scripts": {\n    "install-all": "run-s install:*"  // order-independent\n  }\n}`
  assert.deepEqual(scan(FILE, raw), [])
})

test('// order-independent annotation on preceding line clears the finding', () => {
  const raw = [
    '{',
    '  "scripts": {',
    '    // order-independent',
    // oxlint-disable-next-line socket/no-glob-in-ordered-run-s -- test fixture: scan() input data, not an executable aggregator.
    '    "install-all": "run-s install:*"',
    '  }',
    '}',
  ].join('\n')
  assert.deepEqual(scan(FILE, raw), [])
})

test('# order-independent annotation on same line clears the finding', () => {
  // oxlint-disable-next-line socket/no-glob-in-ordered-run-s -- test fixture: scan() input data, not an executable aggregator.
  const raw = `{\n  "scripts": {\n    "test:all": "run-s test:*"  # order-independent\n  }\n}`
  assert.deepEqual(scan(FILE, raw), [])
})

test('annotation on line two above does NOT clear', () => {
  const raw = [
    '{',
    '  "scripts": {',
    '    // order-independent',
    '    "other": "echo hi",',
    // oxlint-disable-next-line socket/no-glob-in-ordered-run-s -- test fixture: scan() input data, not an executable aggregator.
    '    "gen": "run-s gen:*"',
    '  }',
    '}',
  ].join('\n')
  const findings = scan(FILE, raw)
  assert.equal(findings.length, 1)
})

test('file without scripts block — no findings', () => {
  const raw = '{ "name": "pkg", "version": "1.0.0" }'
  assert.deepEqual(scan(FILE, raw), [])
})
