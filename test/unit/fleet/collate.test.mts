// vitest specs for scanning-vulns/lib/collate — the deterministic
// collate/score/render math (dedupe, id assignment, score normalization,
// summary counts, markdown render, hand-back).

import { describe, test } from 'vitest'
import assert from 'node:assert/strict'

import {
  applyScores,
  assignIds,
  buildEnvelope,
  dropEmpty,
  lightDedupe,
  lowConfidenceCount,
  normalizeScore,
  renderMarkdown,
  summarizeHandback,
} from '../../../scripts/fleet/scanning-vulns/lib/collate.mts'
import type { Finding } from '../../../scripts/fleet/scanning-vulns/lib/collate.mts'

function f(over: Partial<Finding>): Finding {
  return {
    category: 'cat',
    confidence: 0.5,
    description: 'desc',
    file: 'a.ts',
    line: 1,
    severity: 'MEDIUM',
    title: 'title',
    ...over,
  }
}

describe('dropEmpty', () => {
  test('drops findings with no file or no title', () => {
    const out = dropEmpty([
      f({ file: 'a.ts', title: 'real' }),
      f({ file: '', title: 'no file' }),
      f({ file: 'b.ts', title: '' }),
    ])
    assert.equal(out.length, 1)
    assert.equal(out[0]!.title, 'real')
  })
})

describe('lightDedupe', () => {
  test('merges same file:line+category, keeps the longer description', () => {
    const out = lightDedupe([
      f({ file: 'p.c', line: 42, category: 'overflow', description: 'short' }),
      f({
        file: 'p.c',
        line: 42,
        category: 'Overflow',
        description: 'a much longer description',
      }),
    ])
    assert.equal(out.findings.length, 1)
    assert.equal(out.duplicates, 1)
    assert.equal(out.findings[0]!.description, 'a much longer description')
  })
  test('keeps distinct file:line as separate', () => {
    const out = lightDedupe([
      f({ file: 'p.c', line: 1 }),
      f({ file: 'p.c', line: 2 }),
    ])
    assert.equal(out.findings.length, 2)
    assert.equal(out.duplicates, 0)
  })
})

describe('assignIds', () => {
  test('sorts by severity then file then line, ids F-001..', () => {
    const out = assignIds([
      f({ severity: 'LOW', file: 'z.ts', line: 1 }),
      f({ severity: 'HIGH', file: 'b.ts', line: 9 }),
      f({ severity: 'HIGH', file: 'a.ts', line: 5 }),
    ])
    assert.deepEqual(
      out.map(x => `${x.id} ${x.severity} ${x.file}`),
      ['F-001 HIGH a.ts', 'F-002 HIGH b.ts', 'F-003 LOW z.ts'],
    )
  })
})

describe('normalizeScore', () => {
  test('maps 1-10 to 0.0-1.0, clamps, rounds 2dp', () => {
    assert.equal(normalizeScore(10), 1)
    assert.equal(normalizeScore(1), 0.1)
    assert.equal(normalizeScore(5), 0.5)
    assert.equal(normalizeScore(0), 0.1) // clamps up
    assert.equal(normalizeScore(15), 1) // clamps down
    assert.equal(normalizeScore(7), 0.7)
  })
})

describe('applyScores', () => {
  test('overwrites confidence, re-sorts by confidence desc, re-ids', () => {
    const seeded = assignIds([
      f({ file: 'a.ts', severity: 'HIGH', title: 'A' }),
      f({ file: 'b.ts', severity: 'HIGH', title: 'B' }),
    ])
    // a.ts → F-001 low score, b.ts → F-002 high score; expect re-sort.
    const out = applyScores(seeded, [
      { confidence: 2, id: 'F-001' },
      { confidence: 9, id: 'F-002' },
    ])
    assert.equal(out[0]!.title, 'B')
    assert.equal(out[0]!.id, 'F-001')
    assert.equal(out[0]!.confidence, 0.9)
    assert.equal(out[1]!.confidence, 0.2)
  })
  test('an unscored finding keeps its confidence', () => {
    const seeded = assignIds([f({ confidence: 0.55 })])
    const out = applyScores(seeded, [])
    assert.equal(out[0]!.confidence, 0.55)
  })
})

describe('lowConfidenceCount', () => {
  test('counts below the threshold (default 0.4)', () => {
    assert.equal(
      lowConfidenceCount([
        f({ confidence: 0.3 }),
        f({ confidence: 0.4 }),
        f({ confidence: 0.9 }),
      ]),
      1,
    )
  })
})

describe('buildEnvelope', () => {
  test('computes the summary counts', () => {
    const env = buildEnvelope({
      findings: [
        f({ severity: 'HIGH', confidence: 0.9 }),
        f({ severity: 'HIGH', confidence: 0.2 }),
        f({ severity: 'MEDIUM', confidence: 0.8 }),
        f({ severity: 'LOW', confidence: 0.1 }),
      ],
      focusAreas: ['x'],
      scannedAt: '2026-01-01',
      target: './t',
    })
    assert.deepEqual(env.summary, {
      high: 2,
      low: 1,
      low_confidence: 2,
      medium: 1,
      total: 4,
    })
  })
})

describe('renderMarkdown + summarizeHandback', () => {
  test('markdown has a summary table row + a finding section', () => {
    const env = buildEnvelope({
      findings: assignIds([f({ title: 'the bug', file: 'x.c', line: 7 })]),
      focusAreas: ['x'],
      scannedAt: '2026-01-01',
      target: './t',
    })
    const md = renderMarkdown(env)
    assert.ok(md.includes('| F-001 |'))
    assert.ok(md.includes('### F-001 — the bug'))
    assert.ok(md.includes('x.c:7'))
  })
  test('handback names the counts + top-3', () => {
    const env = buildEnvelope({
      findings: assignIds([f({ title: 'top', confidence: 0.9 })]),
      focusAreas: ['x'],
      scannedAt: '2026-01-01',
      target: './t',
    })
    const out = summarizeHandback(env, 42)
    assert.ok(out.includes('42 source file(s)'))
    assert.ok(out.includes('top'))
  })
})
