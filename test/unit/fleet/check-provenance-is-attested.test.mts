// vitest spec for check-provenance-is-attested. The pure exported functions
// (toReportRow + compareSemverDesc) are exercised with inline fixtures; no
// network, no real npm registry. Importing is side-effect-free (main() is
// entrypoint-guarded).

import assert from 'node:assert/strict'

import { describe, test } from 'vitest'

import {
  compareSemverDesc,
  toReportRow,
} from '../../../scripts/fleet/check/provenance-is-attested.mts'
import type { RegistryVersionInfo } from '../../../scripts/fleet/publish-shared.mts'

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function versionInfo(
  partial: Partial<RegistryVersionInfo> = {},
): RegistryVersionInfo {
  return { ...partial }
}

// ---------------------------------------------------------------------------
// toReportRow
// ---------------------------------------------------------------------------

describe('toReportRow', () => {
  test('undefined input → both fields undefined', () => {
    const row = toReportRow(undefined)
    assert.equal(row.attestation, undefined)
    assert.equal(row.trustedPublisher, undefined)
  })

  test('empty object → both fields undefined', () => {
    const row = toReportRow(versionInfo())
    assert.equal(row.attestation, undefined)
    assert.equal(row.trustedPublisher, undefined)
  })

  test('attestations.url is surfaced', () => {
    const row = toReportRow(
      versionInfo({
        attestations: {
          url: 'https://registry.npmjs.org/-/npm/v1/attestations/pkg@1.0.0',
          provenance: {
            predicateType: 'https://slsa.dev/provenance/v1',
          },
        },
      }),
    )
    assert.equal(
      row.attestation,
      'https://registry.npmjs.org/-/npm/v1/attestations/pkg@1.0.0',
    )
  })

  test('trustedPublisher id only (no oidcConfigId) → id string', () => {
    const row = toReportRow(
      versionInfo({ trustedPublisher: { id: 'github-actions' } }),
    )
    assert.equal(row.trustedPublisher, 'github-actions')
  })

  test('trustedPublisher with oidcConfigId → appended short hex', () => {
    const row = toReportRow(
      versionInfo({
        trustedPublisher: {
          id: 'github-actions',
          oidcConfigId: 'abcdef1234567890',
        },
      }),
    )
    // Should contain "github-actions" and the first 8 chars of the oidcConfigId
    assert.match(row.trustedPublisher!, /^github-actions \(abcdef12…\)$/)
  })

  test('full info → both fields populated', () => {
    const row = toReportRow(
      versionInfo({
        attestations: {
          url: 'https://example.com/att',
          provenance: { predicateType: 'https://slsa.dev/provenance/v1' },
        },
        trustedPublisher: { id: 'github-actions' },
      }),
    )
    assert.equal(row.attestation, 'https://example.com/att')
    assert.equal(row.trustedPublisher, 'github-actions')
  })
})

// ---------------------------------------------------------------------------
// compareSemverDesc
// ---------------------------------------------------------------------------

describe('compareSemverDesc', () => {
  test('sorts an array newest-first', () => {
    const versions = ['1.0.0', '2.1.0', '1.10.0', '1.2.3', '3.0.0']
    const sorted = [...versions].toSorted(compareSemverDesc)
    assert.deepEqual(sorted, ['3.0.0', '2.1.0', '1.10.0', '1.2.3', '1.0.0'])
  })

  test('equal versions → 0', () => {
    assert.equal(compareSemverDesc('1.2.3', '1.2.3'), 0)
  })

  test('major wins over minor/patch', () => {
    assert.ok(compareSemverDesc('1.99.99', '2.0.0') > 0, '2.x > 1.x desc')
    assert.ok(compareSemverDesc('2.0.0', '1.99.99') < 0, '1.x < 2.x desc')
  })

  test('minor tie-break', () => {
    assert.ok(compareSemverDesc('1.1.0', '1.2.0') > 0)
    assert.ok(compareSemverDesc('1.2.0', '1.1.0') < 0)
  })

  test('patch tie-break', () => {
    assert.ok(compareSemverDesc('1.0.0', '1.0.1') > 0)
    assert.ok(compareSemverDesc('1.0.1', '1.0.0') < 0)
  })

  test('two-part version strings are handled (missing patch treated as 0)', () => {
    const sorted = ['1.0', '2.0', '1.5'].toSorted(compareSemverDesc)
    assert.deepEqual(sorted, ['2.0', '1.5', '1.0'])
  })

  test('non-semver strings fall back to reverse lexicographic', () => {
    // Contains a non-numeric segment; should not throw
    const result = compareSemverDesc('alpha', 'beta')
    assert.equal(typeof result, 'number')
  })
})
