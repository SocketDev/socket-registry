// vitest specs for cover.mts suite-failure reporting. extractSuiteFailureLines
// must surface WHY a suite failed (vitest's per-config coverage-threshold
// misses live only in the captured suite output, which the summary display
// filters out) — a bare "Coverage failed" with no cause is the fail-silent
// defect this guards against.

import assert from 'node:assert/strict'
import { test } from 'vitest'

import { extractSuiteFailureLines } from '../../../scripts/fleet/cover.mts'

test('passing suite → no failure lines', () => {
  assert.deepEqual(
    extractSuiteFailureLines('isolated', {
      exitCode: 0,
      stderr: 'ERROR: would be scary if surfaced',
      stdout: '',
    }),
    [],
  )
})

test('vitest coverage-threshold miss is surfaced with the suite name', () => {
  const lines = extractSuiteFailureLines('isolated', {
    exitCode: 1,
    stderr:
      'ERROR: Coverage for branches (46.92%) does not meet global threshold (49%)\n',
    stdout: 'Test Files  12 passed (12)\n',
  })
  assert.equal(lines[0], 'isolated suite failed (exit 1):')
  assert.ok(
    lines.some(line => /branches \(46\.92%\) does not meet/.test(line)),
    `threshold miss must be surfaced; got ${JSON.stringify(lines)}`,
  )
})

test('duplicate error lines across stdout/stderr are deduped', () => {
  const errorLine =
    'ERROR: Coverage for lines (90%) does not meet global threshold (93%)'
  const lines = extractSuiteFailureLines('main', {
    exitCode: 1,
    stderr: `${errorLine}\n`,
    stdout: `${errorLine}\n`,
  })
  assert.equal(
    lines.filter(line => line.includes('does not meet')).length,
    1,
    `duplicate error lines must collapse; got ${JSON.stringify(lines)}`,
  )
})

test('no error-ish lines → falls back to the output tail, capped', () => {
  const stdout = Array.from({ length: 40 }, (_, i) => `line ${i}`).join('\n')
  const lines = extractSuiteFailureLines('main', {
    exitCode: 2,
    stderr: '',
    stdout,
  })
  assert.equal(lines[0], 'main suite failed (exit 2):')
  // Header + at most 12 detail lines, drawn from the tail.
  assert.ok(
    lines.length <= 13,
    `capped at 12 detail lines; got ${lines.length}`,
  )
  assert.ok(lines.at(-1)!.includes('line 39'))
})
