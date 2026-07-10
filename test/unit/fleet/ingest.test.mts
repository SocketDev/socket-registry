// vitest specs for triaging-findings/lib/ingest — the Phase-1b field
// normalization: the alias map, confidence normalization, id assignment,
// missing_fields, and the fixed unlocatable envelope.

import { describe, test } from 'vitest'
import assert from 'node:assert/strict'

import {
  ingest,
  isUnlocatable,
  normalizeConfidence,
  normalizeRecord,
  pullField,
  unlocatableEnvelope,
} from '../../../scripts/fleet/triaging-findings/lib/ingest.mts'

describe('pullField — alias map', () => {
  test('first present alias wins', () => {
    assert.equal(pullField({ path: 'a.c' }, 'file'), 'a.c')
    assert.equal(pullField({ filename: 'b.c' }, 'file'), 'b.c')
    assert.equal(pullField({ vuln_class: 'overflow' }, 'category'), 'overflow')
    assert.equal(pullField({ risk: 'HIGH' }, 'severity'), 'HIGH')
    assert.equal(pullField({ message: 'msg' }, 'title'), 'msg')
  })
  test('reads nested location.file / location.line', () => {
    assert.equal(pullField({ location: { file: 'x.ts' } }, 'file'), 'x.ts')
    assert.equal(pullField({ location: { line: 9 } }, 'line'), 9)
  })
  test('undefined when no alias present', () => {
    assert.equal(pullField({ other: 1 }, 'file'), undefined)
  })
})

describe('normalizeConfidence', () => {
  test('keeps 0-1, scales 1-10 and 1-100', () => {
    assert.equal(normalizeConfidence(0.7), 0.7)
    assert.equal(normalizeConfidence(8), 0.8)
    assert.equal(normalizeConfidence(75), 0.75)
    assert.equal(normalizeConfidence(1), 1)
  })
  test('undefined for non-number', () => {
    assert.equal(normalizeConfidence('high'), undefined)
    assert.equal(normalizeConfidence(undefined), undefined)
  })
})

describe('normalizeRecord', () => {
  test('maps aliases + records missing_fields', () => {
    const f = normalizeRecord(
      { line_number: 42, message: 'm', path: 'p.c', vuln_class: 'of' },
      'f001',
      'src.json',
    )
    assert.equal(f.file, 'p.c')
    assert.equal(f.line, 42)
    assert.equal(f.category, 'of')
    assert.equal(f.title, 'm')
    assert.equal(f.id, 'f001')
    // severity/description/etc absent → in missing_fields.
    assert.ok(f.missing_fields.includes('severity'))
    assert.ok(f.missing_fields.includes('description'))
    assert.ok(!f.missing_fields.includes('file'))
  })
  test('coerces a string line number', () => {
    assert.equal(normalizeRecord({ line: '7', path: 'a' }, 'f001', 's').line, 7)
  })
})

describe('unlocatable handling', () => {
  test('isUnlocatable when file is absent', () => {
    assert.equal(
      isUnlocatable(normalizeRecord({ type: 'x' }, 'f001', 's')),
      true,
    )
    assert.equal(
      isUnlocatable(normalizeRecord({ path: 'a.c' }, 'f001', 's')),
      false,
    )
  })
  test('the fixed envelope has the constant verdict shape', () => {
    const env = unlocatableEnvelope(normalizeRecord({ type: 'x' }, 'f001', 's'))
    assert.equal(env.verdict, 'false_positive')
    assert.equal(env.verify_verdict, 'needs_manual_test')
    assert.equal(env.confidence, 0)
    assert.deepEqual(env.refute_reasons, ['doesnt_exist'])
    assert.ok(env.rationale?.includes('cannot verify'))
  })
})

describe('ingest (end to end)', () => {
  test('orders by confidence when most records carry it, assigns f-ids', () => {
    const out = ingest(
      [
        { confidence: 0.2, path: 'a', type: 't' },
        { confidence: 0.9, path: 'b', type: 't' },
      ],
      'src',
    )
    assert.equal(out[0]!.id, 'f001')
    assert.equal(out[0]!.file, 'b') // higher confidence first
    assert.equal(out[1]!.file, 'a')
  })
  test('keeps source order when confidence is sparse', () => {
    const out = ingest(
      [
        { path: 'a', type: 't' },
        { confidence: 0.9, path: 'b', type: 't' },
      ],
      'src',
    )
    assert.equal(out[0]!.file, 'a')
  })
  test('wraps an unlocatable finding in the envelope', () => {
    const out = ingest([{ type: 'phantom' }], 'src')
    assert.equal(out[0]!.verdict, 'false_positive')
    assert.deepEqual(out[0]!.refute_reasons, ['doesnt_exist'])
  })
})
