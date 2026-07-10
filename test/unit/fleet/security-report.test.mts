// vitest specs for lib/security-report — the A-F grade rubric + HANDOFF
// envelope. The grade table must match _shared/report-format.md exactly; these
// assertions are the executable owner of that rubric.

import { describe, test } from 'vitest'
import assert from 'node:assert/strict'

import {
  computeGrade,
  renderHandoff,
} from '../../../scripts/fleet/lib/security-report.mts'
import type { FindingCounts } from '../../../scripts/fleet/lib/security-report.mts'

function counts(over: Partial<FindingCounts>): FindingCounts {
  return { critical: 0, high: 0, low: 0, medium: 0, ...over }
}

describe('computeGrade — matches report-format.md A-F table', () => {
  test('A: 0 critical, 0 high', () => {
    assert.equal(computeGrade(counts({})), 'A')
    assert.equal(computeGrade(counts({ low: 9, medium: 9 })), 'A')
  })
  test('B: 0 critical, 1-3 high', () => {
    assert.equal(computeGrade(counts({ high: 1 })), 'B')
    assert.equal(computeGrade(counts({ high: 3 })), 'B')
  })
  test('C: 0 critical + 4+ high, OR exactly 1 critical', () => {
    assert.equal(computeGrade(counts({ high: 4 })), 'C')
    assert.equal(computeGrade(counts({ critical: 1 })), 'C')
    assert.equal(computeGrade(counts({ critical: 1, high: 99 })), 'C')
  })
  test('D: 2-3 critical', () => {
    assert.equal(computeGrade(counts({ critical: 2 })), 'D')
    assert.equal(computeGrade(counts({ critical: 3 })), 'D')
  })
  test('F: 4+ critical', () => {
    assert.equal(computeGrade(counts({ critical: 4 })), 'F')
    assert.equal(computeGrade(counts({ critical: 10 })), 'F')
  })
  test('critical dominates high', () => {
    // 4 critical is F regardless of high count.
    assert.equal(computeGrade(counts({ critical: 4, high: 0 })), 'F')
  })
})

describe('renderHandoff', () => {
  test('emits the documented === HANDOFF === block, grade from counts', () => {
    const out = renderHandoff({
      counts: counts({ high: 2, medium: 1 }),
      skill: 'scanning-security',
      status: 'pass',
      summary: 'two highs',
    })
    assert.ok(out.startsWith('=== HANDOFF: scanning-security ==='))
    assert.ok(out.includes('Status: pass'))
    assert.ok(out.includes('Grade: B'))
    assert.ok(
      out.includes('Findings: {critical: 0, high: 2, medium: 1, low: 0}'),
    )
    assert.ok(out.includes('Summary: two highs'))
    assert.ok(out.trimEnd().endsWith('=== END HANDOFF ==='))
  })
  test('an explicit grade overrides the computed one', () => {
    const out = renderHandoff({
      counts: counts({}),
      grade: 'F',
      skill: 's',
      status: 'fail',
      summary: 'x',
    })
    assert.ok(out.includes('Grade: F'))
  })
})
