// vitest specs for triaging-findings/lib/report — the Phase-6 sort, summary
// counts, and the every-finding-once invariant (a dropped/duplicated/invented
// id throws).

import { describe, test } from 'vitest'
import assert from 'node:assert/strict'

import {
  assertEveryFindingOnce,
  buildTriageEnvelope,
  computeSummary,
  sortFindings,
  terminalSummary,
} from '../../../scripts/fleet/triaging-findings/lib/report.mts'
import type { TriagedFinding } from '../../../scripts/fleet/triaging-findings/lib/report.mts'

function tf(over: Partial<TriagedFinding>): TriagedFinding {
  return { id: 'f001', verdict: 'true_positive', ...over } as TriagedFinding
}

describe('sortFindings', () => {
  test('verdict order: true_positive, then duplicate, then false_positive', () => {
    const out = sortFindings([
      tf({ id: 'f1', verdict: 'false_positive' }),
      tf({ id: 'f2', verdict: 'duplicate' }),
      tf({ id: 'f3', severity: 'LOW', verdict: 'true_positive' }),
    ])
    assert.deepEqual(
      out.map(f => f.verdict),
      ['true_positive', 'duplicate', 'false_positive'],
    )
  })
  test('true positives by severity then confidence', () => {
    const out = sortFindings([
      tf({ confidence: 0.9, id: 'low', severity: 'LOW' }),
      tf({ confidence: 0.5, id: 'hiA', severity: 'HIGH' }),
      tf({ confidence: 0.9, id: 'hiB', severity: 'HIGH' }),
    ])
    assert.deepEqual(
      out.map(f => f.id),
      ['hiB', 'hiA', 'low'],
    )
  })
})

describe('computeSummary', () => {
  test('counts verdicts + severity + needs_manual_test', () => {
    const s = computeSummary(
      [
        tf({ severity: 'HIGH', verdict: 'true_positive' }),
        tf({ severity: 'LOW', verdict: 'true_positive' }),
        tf({ verdict: 'duplicate' }),
        tf({ verdict: 'false_positive', verify_verdict: 'needs_manual_test' }),
      ],
      4,
    )
    assert.equal(s.true_positives, 2)
    assert.equal(s.duplicates, 1)
    assert.equal(s.false_positives, 1)
    assert.equal(s.needs_manual_test, 1)
    assert.deepEqual(s.by_severity, { HIGH: 1, LOW: 1, MEDIUM: 0 })
    assert.equal(s.input_count, 4)
  })
})

describe('assertEveryFindingOnce', () => {
  test('passes when input == output exactly', () => {
    assert.doesNotThrow(() =>
      assertEveryFindingOnce(
        [tf({ id: 'f001' }), tf({ id: 'f002' })],
        ['f001', 'f002'],
      ),
    )
  })
  test('throws on a dropped id', () => {
    assert.throws(
      () => assertEveryFindingOnce([tf({ id: 'f001' })], ['f001', 'f002']),
      /missing from the output/u,
    )
  })
  test('throws on a duplicated id', () => {
    assert.throws(
      () =>
        assertEveryFindingOnce(
          [tf({ id: 'f001' }), tf({ id: 'f001' })],
          ['f001'],
        ),
      /more than once/u,
    )
  })
  test('throws on an invented id', () => {
    // f001 present (not dropped) + f999 extra → only the invented-id check fires.
    assert.throws(
      () =>
        assertEveryFindingOnce(
          [tf({ id: 'f001' }), tf({ id: 'f999' })],
          ['f001'],
        ),
      /not in the input/u,
    )
  })
})

describe('buildTriageEnvelope', () => {
  test('sorts, summarizes, and enforces the invariant', () => {
    const env = buildTriageEnvelope({
      context: { mode: 'auto' },
      findings: [
        tf({ id: 'f002', verdict: 'false_positive' }),
        tf({ confidence: 0.9, id: 'f001', severity: 'HIGH' }),
      ],
      inputIds: ['f001', 'f002'],
    })
    assert.equal(env.triage_completed, true)
    assert.equal(env.findings[0]!.id, 'f001') // TP sorts before FP
    assert.equal(env.summary.true_positives, 1)
    assert.equal(env.summary.false_positives, 1)
  })
  test('throws (does not emit) when a finding is dropped', () => {
    assert.throws(() =>
      buildTriageEnvelope({
        context: {},
        findings: [tf({ id: 'f001' })],
        inputIds: ['f001', 'f002'],
      }),
    )
  })
})

describe('terminalSummary', () => {
  test('names counts, severity split, top HIGH + owner', () => {
    const env = buildTriageEnvelope({
      context: {},
      findings: [
        tf({
          confidence: 0.9,
          id: 'f001',
          owner_hint: 'alice',
          severity: 'HIGH',
          title: 'the bug',
        }),
      ],
      inputIds: ['f001'],
    })
    const out = terminalSummary(env)
    assert.ok(out.includes('1 confirmed'))
    assert.ok(out.includes('the bug'))
    assert.ok(out.includes('alice'))
  })
})
