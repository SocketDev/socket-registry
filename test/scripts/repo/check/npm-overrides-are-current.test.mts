/**
 * @file Unit tests for the overrides-track-upstream law's report shape:
 *   silent (undefined) when every override is current, and a remedy-bearing
 *   report when any override lags upstream — both arms. Network and the
 *   sync driver are out of scope here; the check's fetch path degrades to
 *   a pass offline by design.
 */

import { describe, expect, it } from 'vitest'

import { formatStaleReport } from '../../../../scripts/repo/check/npm-overrides-are-current.mts'

import type { OverrideDrift } from '../../../../scripts/npm/sync-npm-overrides.mts'

function drift(
  status: OverrideDrift['status'],
  latestVersion = '2.2.4',
): OverrideDrift {
  return {
    socketPkgName: '@socketregistry/deep-equal',
    upstreamName: 'deep-equal',
    pinnedSpec: '2.2.3',
    targetVersion: '2.2.4',
    latestVersion,
    status,
  }
}

describe('scripts/repo/check/npm-overrides-are-current', () => {
  it('reports nothing when all overrides are current', () => {
    expect(formatStaleReport([drift('current')])).toBeUndefined()
    expect(formatStaleReport([])).toBeUndefined()
  })

  it('ignores unpinnable and unresolved entries', () => {
    expect(
      formatStaleReport([
        drift('unpinnable-spec'),
        drift('unresolved'),
        drift('unpinned'),
      ]),
    ).toBeUndefined()
  })

  it('reports stale overrides with versions and the remedy command', () => {
    const report = formatStaleReport([drift('stale'), drift('current')])
    expect(report).toBeDefined()
    expect(report).toContain(
      '1 npm override(s) behind their newest soak-cleared upstream',
    )
    expect(report).toContain('@socketregistry/deep-equal')
    expect(report).toContain('2.2.3 -> 2.2.4')
    expect(report).not.toContain('still soaking')
    expect(report).toContain('node scripts/npm/sync-npm-overrides.mts --apply')
  })

  it('notes when a newer latest exists but is still inside the soak', () => {
    const report = formatStaleReport([drift('stale', '2.3.0')])
    expect(report).toContain('2.2.3 -> 2.2.4 (latest 2.3.0 still soaking)')
  })
})
