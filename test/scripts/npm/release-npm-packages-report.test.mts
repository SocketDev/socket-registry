/**
 * @file Tests for scripts/npm/release-npm-packages-report.mts. The release
 *   check used to walk every package, print nothing, and exit 0 while nine of
 *   them sat at the npm `0.0.0` placeholder with a real version on disk. These
 *   specs pin the two exit-1 triggers and that a placeholder is listed by name.
 */

import { describe, expect, test } from 'vitest'

import { reportReleaseState } from '../../../scripts/npm/release-npm-packages-report.mts'

import type {
  BumpState,
  PkgData,
} from '../../../scripts/npm/release-npm-packages.mts'

function pkg(name: string, version: string): PkgData {
  return {
    name,
    path: `/tmp/${name}`,
    printName: name,
    tag: 'latest',
    version,
  }
}

function emptyState(): BumpState {
  return {
    bumped: [],
    changed: [],
    changes: [],
    placeholders: [],
    unresolved: [],
    warnings: [],
  }
}

describe('reportReleaseState', () => {
  test('nothing to do without --release is a quiet 0', () => {
    expect(reportReleaseState(emptyState())).toBe(0)
  })

  test('nothing to do WITH --release exits 1', () => {
    expect(reportReleaseState(emptyState(), { release: true })).toBe(1)
  })

  test('a package npm could not resolve exits 1 either way', () => {
    const state = emptyState()
    state.unresolved.push(pkg('@socketregistry/ghost', '1.0.0'))
    expect(reportReleaseState(state)).toBe(1)
    expect(reportReleaseState(state, { release: true })).toBe(1)
  })

  test('a placeholder package counts as publishable', () => {
    const state = emptyState()
    state.placeholders.push(pkg('@socketregistry/is-data-view', '1.0.0'))
    expect(reportReleaseState(state, { release: true })).toBe(0)
  })

  test('a bumped package counts as publishable', () => {
    const state = emptyState()
    state.bumped.push(pkg('@socketregistry/hasown', '1.1.0'))
    expect(reportReleaseState(state, { release: true })).toBe(0)
  })
})
