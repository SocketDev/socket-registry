// vitest specs for cover.mts threshold gating. checkThresholds compares the
// merged aggregate coverage against cover.json thresholds and must fail
// CLOSED: configured thresholds with a missing aggregate (a tier clobbered
// coverage-final.json before the merge) is a gate failure, not a pass.

import assert from 'node:assert/strict'
import { test } from 'vitest'

import { checkThresholds } from '../../../scripts/fleet/cover.mts'

const AGGREGATE = {
  branches: '96.99',
  functions: '100',
  lines: '99.43',
  statements: '99.45',
}

test('no thresholds configured → report-only, no failures', () => {
  assert.deepEqual(checkThresholds(undefined, undefined), [])
  assert.deepEqual(checkThresholds(AGGREGATE, undefined), [])
})

test('thresholds met → no failures', () => {
  assert.deepEqual(
    checkThresholds(AGGREGATE, {
      branches: 95,
      functions: 100,
      lines: 99,
      statements: 99,
    }),
    [],
  )
})

test('each metric under its minimum is reported', () => {
  const failures = checkThresholds(AGGREGATE, {
    branches: 99,
    functions: 100,
    lines: 99.95,
    statements: 99.95,
  })
  assert.equal(failures.length, 3)
  assert.match(failures.join('; '), /statements 99\.45% < 99\.95%/)
  assert.match(failures.join('; '), /branches 96\.99% < 99%/)
  assert.match(failures.join('; '), /lines 99\.43% < 99\.95%/)
})

test('fails closed when thresholds are set but the aggregate is missing', () => {
  const failures = checkThresholds(undefined, { lines: 100 })
  assert.equal(failures.length, 1)
  assert.match(failures[0]!, /aggregate coverage unavailable/)
})
