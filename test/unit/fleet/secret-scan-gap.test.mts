// vitest specs for scripts/fleet/lib/doctor/secret-scan-gap.mts

import assert from 'node:assert/strict'

import { describe, test } from 'vitest'

import {
  formatSecretFindings,
  formatToolMissingFinding,
  parseTruffleHogFindings,
  readHitLocation,
  sortHits,
} from '../../../scripts/fleet/lib/doctor/secret-scan-gap.mts'

// ── readHitLocation ──────────────────────────────────────────────────────────

describe('readHitLocation', () => {
  test('reads a Filesystem block (file + line)', () => {
    const loc = readHitLocation({
      Data: { Filesystem: { file: 'config/prod.env', line: 5 } },
    })
    assert.deepEqual(loc, { file: 'config/prod.env', line: 5 })
  })

  test('reads a Git block when Filesystem is absent', () => {
    const loc = readHitLocation({
      Data: { Git: { file: 'src/x.ts', line: 3 } },
    })
    assert.deepEqual(loc, { file: 'src/x.ts', line: 3 })
  })

  test('line absent → undefined line', () => {
    const loc = readHitLocation({ Data: { Filesystem: { file: 'a.txt' } } })
    assert.deepEqual(loc, { file: 'a.txt', line: undefined })
  })

  test('malformed metadata → both undefined', () => {
    assert.deepEqual(readHitLocation(undefined), {
      file: undefined,
      line: undefined,
    })
    assert.deepEqual(readHitLocation({ Data: 42 }), {
      file: undefined,
      line: undefined,
    })
  })
})

// ── parseTruffleHogFindings ──────────────────────────────────────────────────

describe('parseTruffleHogFindings', () => {
  test('parses JSONL with a verified + an unverified hit', () => {
    const jsonl = [
      JSON.stringify({
        SourceMetadata: {
          Data: { Filesystem: { file: 'config/prod.env', line: 5 } },
        },
        DetectorName: 'AWS',
        Verified: true,
      }),
      JSON.stringify({
        SourceMetadata: { Data: { Filesystem: { file: 'test/fixture.txt' } } },
        DetectorName: 'Generic',
        Verified: false,
      }),
    ].join('\n')
    const hits = parseTruffleHogFindings(jsonl)
    assert.equal(hits.length, 2)
    assert.deepEqual(hits[0], {
      detectorName: 'AWS',
      file: 'config/prod.env',
      line: 5,
      verified: true,
    })
    assert.deepEqual(hits[1], {
      detectorName: 'Generic',
      file: 'test/fixture.txt',
      line: undefined,
      verified: false,
    })
  })

  test('ignores blank lines and non-JSON progress/log lines', () => {
    const jsonl = [
      '',
      '🐷🔑 TruffleHog. Unearth your secrets.',
      '2026-07-03T00:00:00Z  info  scanning…',
      JSON.stringify({
        SourceMetadata: { Data: { Git: { file: 'src/x.ts', line: 3 } } },
        DetectorName: 'GitHub',
        Verified: true,
      }),
      '',
    ].join('\n')
    const hits = parseTruffleHogFindings(jsonl)
    assert.equal(hits.length, 1)
    assert.equal(hits[0]!.detectorName, 'GitHub')
    assert.equal(hits[0]!.file, 'src/x.ts')
  })

  test('drops finding objects with no file location', () => {
    const jsonl = JSON.stringify({
      SourceMetadata: { Data: {} },
      DetectorName: 'AWS',
      Verified: true,
    })
    assert.deepEqual(parseTruffleHogFindings(jsonl), [])
  })

  test('deduplicates identical hits', () => {
    const line = JSON.stringify({
      SourceMetadata: { Data: { Filesystem: { file: 'a.env', line: 1 } } },
      DetectorName: 'AWS',
      Verified: true,
    })
    const hits = parseTruffleHogFindings([line, line].join('\n'))
    assert.equal(hits.length, 1)
  })

  test('empty output → no hits', () => {
    assert.deepEqual(parseTruffleHogFindings(''), [])
  })
})

// ── sortHits ─────────────────────────────────────────────────────────────────

describe('sortHits', () => {
  test('verified hits rank before unverified', () => {
    const sorted = sortHits([
      { detectorName: 'X', file: 'z.txt', line: 1, verified: false },
      { detectorName: 'Y', file: 'a.txt', line: 1, verified: true },
    ])
    assert.equal(sorted[0]!.verified, true)
    assert.equal(sorted[1]!.verified, false)
  })

  test('within a verified group, sorts by file then line', () => {
    const sorted = sortHits([
      { detectorName: 'X', file: 'b.txt', line: 9, verified: true },
      { detectorName: 'Y', file: 'a.txt', line: 2, verified: true },
      { detectorName: 'Z', file: 'a.txt', line: 1, verified: true },
    ])
    assert.deepEqual(
      sorted.map(h => `${h.file}:${h.line}`),
      ['a.txt:1', 'a.txt:2', 'b.txt:9'],
    )
  })
})

// ── formatSecretFindings ─────────────────────────────────────────────────────

describe('formatSecretFindings', () => {
  test('one report-only finding per hit, verified first, all six ingredients', () => {
    const findings = formatSecretFindings([
      {
        detectorName: 'Generic',
        file: 'b.txt',
        line: undefined,
        verified: false,
      },
      { detectorName: 'AWS', file: 'a.env', line: 5, verified: true },
    ])
    assert.equal(findings.length, 2)
    // verified ranked first
    assert.ok(findings[0]!.what.includes('AWS'))
    assert.ok(findings[0]!.what.includes('VERIFIED'))
    assert.equal(findings[0]!.where, 'a.env:5')
    // second is the unverified one; no line → file only
    assert.equal(findings[1]!.where, 'b.txt')
    for (const f of findings) {
      assert.equal(f.fixable, false)
      assert.ok(f.what.length > 0)
      assert.ok(f.where.length > 0)
      assert.ok(f.saw.length > 0)
      assert.ok(f.wanted.length > 0)
      assert.ok(f.fix.includes('Rotate'))
    }
  })

  test('no hits → no findings', () => {
    assert.deepEqual(formatSecretFindings([]), [])
  })
})

// ── formatToolMissingFinding ─────────────────────────────────────────────────

describe('formatToolMissingFinding', () => {
  test('is report-only with all six ingredients and does not claim clean', () => {
    const f = formatToolMissingFinding()
    assert.equal(f.fixable, false)
    assert.ok(f.what.length > 0)
    assert.ok(
      f.where.includes('trufflehog') || f.where.includes('external-tools'),
    )
    assert.ok(f.saw.includes('NOT confirmed clean'))
    assert.ok(f.fix.includes('setup'))
  })
})
