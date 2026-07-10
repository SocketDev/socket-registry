// vitest specs for scanning-quality/lib/findings — the pure finding algebra:
// dedupe by file:line:issue, merge variants, drop majority-refuted, count by
// severity, and the A-F grade (reused from the security-report rubric).

import { describe, test } from 'vitest'
import assert from 'node:assert/strict'

import {
  countBySeverity,
  dedupeFindings,
  dropRefuted,
  findingKey,
  gradeOf,
  mergeVariants,
} from '../../../scripts/fleet/scanning-quality/lib/findings.mts'
import type {
  QualityFinding,
  RefuteVote,
} from '../../../scripts/fleet/scanning-quality/lib/findings.mts'

function f(over: Partial<QualityFinding>): QualityFinding {
  return { file: 'a.ts', issue: 'bug', line: 1, severity: 'high', ...over }
}

describe('findingKey + dedupeFindings', () => {
  test('normalizes the issue text (case + punctuation) for the key', () => {
    assert.equal(
      findingKey(f({ issue: 'Race Condition!' })),
      findingKey(f({ issue: 'race condition' })),
    )
  })
  test('collapses same file:line:issue, keeps distinct', () => {
    const out = dedupeFindings([
      f({ issue: 'Race condition!' }),
      f({ issue: 'race condition' }),
      f({ line: 2 }),
    ])
    assert.equal(out.length, 2)
  })
})

describe('mergeVariants', () => {
  test('dedups across base + variants', () => {
    const out = mergeVariants([f({})], [f({}), f({ issue: 'other', line: 9 })])
    assert.equal(out.length, 2)
  })
})

describe('dropRefuted', () => {
  const findings = [f({ issue: 'a' }), f({ issue: 'b' }), f({ issue: 'c' })]
  test('majority isReal=false drops; tie keeps; no-votes keeps', () => {
    const votes = new Map<number, RefuteVote[]>([
      [0, [{ isReal: false }, { isReal: false }, { isReal: true }]], // 2/3 refute → drop
      [1, [{ isReal: true }, { isReal: false }]], // tie → keep
    ])
    const kept = dropRefuted(findings, votes)
    assert.equal(kept.length, 2)
    assert.ok(!kept.some(x => x.issue === 'a'))
    assert.ok(kept.some(x => x.issue === 'b'))
    assert.ok(kept.some(x => x.issue === 'c')) // no votes → keep
  })
})

describe('countBySeverity', () => {
  test('tallies each severity bucket', () => {
    assert.deepEqual(
      countBySeverity([
        f({ severity: 'critical' }),
        f({ severity: 'high' }),
        f({ severity: 'high' }),
      ]),
      { critical: 1, high: 2, low: 0, medium: 0 },
    )
  })
})

describe('gradeOf (reuses the A-F rubric)', () => {
  test('0 findings → A; 1 high → B; 4 critical → F', () => {
    assert.equal(gradeOf([]), 'A')
    assert.equal(gradeOf([f({ severity: 'high' })]), 'B')
    assert.equal(
      gradeOf([
        f({ severity: 'critical' }),
        f({ severity: 'critical' }),
        f({ severity: 'critical' }),
        f({ severity: 'critical' }),
      ]),
      'F',
    )
  })
})
