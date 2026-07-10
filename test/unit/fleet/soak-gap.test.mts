// vitest specs for scripts/fleet/lib/doctor/soak-gap.mts

import assert from 'node:assert/strict'

import { describe, test } from 'vitest'

import {
  formatSoakFinding,
  parseSoakViolations,
} from '../../../scripts/fleet/lib/doctor/soak-gap.mts'

// ── parseSoakViolations ──────────────────────────────────────────────────────

describe('parseSoakViolations', () => {
  test('extracts spec from ERR_PNPM_NO_MATURE_MATCHING_VERSION output', () => {
    const stderr = [
      'ERR_PNPM_NO_MATURE_MATCHING_VERSION',
      'No matching version found for @oxc-project/types@0.138.0',
      '',
    ].join('\n')
    const specs = parseSoakViolations(stderr)
    assert.ok(
      specs.includes('@oxc-project/types@0.138.0'),
      `expected @oxc-project/types@0.138.0 in ${JSON.stringify(specs)}`,
    )
  })

  test('extracts specs from the real pnpm 11 detail format (was published at … minimumReleaseAge)', () => {
    // The actual ERR_PNPM_NO_MATURE_MATCHING_VERSION output (verified live on
    // ultrathink) — one detail line per spec, not "No matching version found".
    const stderr = [
      '[ERR_PNPM_NO_MATURE_MATCHING_VERSION] 2 versions do not meet the minimumReleaseAge constraint:',
      '  @oxc-project/types@0.138.0 was published at 2026-06-29T19:17:51.178Z, within the minimumReleaseAge cutoff (2026-06-26T00:31:14.212Z)',
      '  js-yaml@5.2.0 was published at 2026-06-26T20:07:00.244Z, within the minimumReleaseAge cutoff (2026-06-26T00:31:14.212Z)',
    ].join('\n')
    assert.deepEqual(parseSoakViolations(stderr), [
      '@oxc-project/types@0.138.0',
      'js-yaml@5.2.0',
    ])
  })

  test('deduplicates repeated violations', () => {
    const stderr = [
      'ERR_PNPM_NO_MATURE_MATCHING_VERSION',
      'No matching version found for js-yaml@5.2.0',
      '',
      'ERR_PNPM_NO_MATURE_MATCHING_VERSION',
      'No matching version found for js-yaml@5.2.0',
    ].join('\n')
    const specs = parseSoakViolations(stderr)
    assert.equal(
      specs.filter(s => s === 'js-yaml@5.2.0').length,
      1,
      'should deduplicate',
    )
  })

  test('returns empty array when no soak violations present', () => {
    assert.deepEqual(parseSoakViolations('pnpm install success\n'), [])
  })
})

// ── formatSoakFinding ────────────────────────────────────────────────────────

describe('formatSoakFinding', () => {
  test('produces a report-only finding with the annotated exclude shape', () => {
    const f = formatSoakFinding('@oxc-project/types@0.138.0')
    assert.equal(f.fixable, false)
    assert.ok(f.what.includes('@oxc-project/types@0.138.0'))
    assert.ok(f.fix.includes('minimumReleaseAgeExclude'))
    assert.ok(f.fix.includes('published: YYYY-MM-DD | removable: YYYY-MM-DD'))
    assert.ok(f.fix.includes("- '@oxc-project/types@0.138.0'"))
    assert.ok(f.fix.includes('pnpm view @oxc-project/types time --json'))
  })

  test('all four finding ingredients are non-empty', () => {
    const f = formatSoakFinding('js-yaml@5.2.0')
    assert.ok(f.what.length > 0)
    assert.ok(f.where.length > 0)
    assert.ok(f.saw.length > 0)
    assert.ok(f.fix.length > 0)
  })
})
