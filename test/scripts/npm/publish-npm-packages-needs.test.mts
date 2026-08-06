/**
 * @file Tests for scripts/repo/npm/publish-npm-packages-needs.mts. Two defects live
 *   here. `getReleaseTag` parses a SPEC, so the call sites that handed it a
 *   bare version always got back the empty string and npm rejected every upload
 *   with `Tag must be a non-empty string`. And a package npm holds at the
 *   `0.0.0` name-reservation placeholder answers YES to "is it published?",
 *   which is how nine of them stayed invisible with `1.0.0` ready on disk.
 */

import { describe, expect, test } from 'vitest'

import {
  isPlaceholderNpmVersion,
  matchesOnlyFilter,
  parseOnlyFilter,
  PLACEHOLDER_NPM_VERSION,
  resolveDistTag,
  resolveNeedsPublish,
} from '../../../scripts/repo/npm/publish-npm-packages-needs.mts'

describe('resolveDistTag', () => {
  test('a release version publishes under latest', () => {
    expect(resolveDistTag('1.0.0')).toBe('latest')
    expect(resolveDistTag('2.0.5')).toBe('latest')
    expect(resolveDistTag(PLACEHOLDER_NPM_VERSION)).toBe('latest')
  })

  test('a prerelease publishes under its own identifier', () => {
    expect(resolveDistTag('1.0.0-beta.2')).toBe('beta')
    expect(resolveDistTag('1.0.0-next')).toBe('next')
    expect(resolveDistTag('3.1.0-canary.17')).toBe('canary')
  })

  test('a numeric prerelease identifier falls back to next', () => {
    expect(resolveDistTag('1.0.0-1')).toBe('next')
  })

  test('never returns the empty string npm rejects', () => {
    for (const version of ['1.0.0', '', 'not-a-version', '1.0.0-rc.1']) {
      expect(resolveDistTag(version)).not.toBe('')
    }
  })
})

describe('resolveNeedsPublish', () => {
  test('an npm 0.0.0 placeholder with a real local version needs publishing', () => {
    const verdict = resolveNeedsPublish({
      localVersion: '1.0.0',
      name: '@socketregistry/is-data-view',
      remoteVersion: '0.0.0',
    })
    expect(verdict.needsPublish).toBe(true)
    expect(verdict.reason).toBe('placeholder')
    expect(verdict.summary).toContain('first real publish')
  })

  test('a placeholder on both sides needs nothing', () => {
    const verdict = resolveNeedsPublish({
      localVersion: '0.0.0',
      name: '@socketregistry/reserved',
      remoteVersion: '0.0.0',
    })
    expect(verdict.needsPublish).toBe(false)
    expect(verdict.reason).toBe('placeholder')
  })

  test('a never-published name needs publishing', () => {
    const verdict = resolveNeedsPublish({
      localVersion: '1.0.0',
      name: '@socketregistry/brand-new',
      remoteVersion: undefined,
    })
    expect(verdict.needsPublish).toBe(true)
    expect(verdict.reason).toBe('unpublished')
  })

  test('a bumped version needs publishing', () => {
    const verdict = resolveNeedsPublish({
      localVersion: '1.2.0',
      name: '@socketregistry/hasown',
      remoteVersion: '1.1.0',
    })
    expect(verdict.needsPublish).toBe(true)
    expect(verdict.reason).toBe('bumped')
    expect(verdict.summary).toContain('1.1.0 → 1.2.0')
  })

  test('an up-to-date package needs nothing', () => {
    const verdict = resolveNeedsPublish({
      localVersion: '1.1.0',
      name: '@socketregistry/hasown',
      remoteVersion: '1.1.0',
    })
    expect(verdict.needsPublish).toBe(false)
    expect(verdict.reason).toBe('current')
  })
})

describe('isPlaceholderNpmVersion', () => {
  test('only 0.0.0 is the placeholder', () => {
    expect(isPlaceholderNpmVersion('0.0.0')).toBe(true)
    expect(isPlaceholderNpmVersion('0.0.1')).toBe(false)
    expect(isPlaceholderNpmVersion(undefined)).toBe(false)
  })
})

describe('the only filter', () => {
  test('an empty filter matches everything', () => {
    const filter = parseOnlyFilter('')
    expect(filter.size).toBe(0)
    expect(matchesOnlyFilter(filter, '@socketregistry/anything')).toBe(true)
  })

  test('a package matches on its full name or its directory name', () => {
    const filter = parseOnlyFilter('own-keys, @socketregistry/is-data-view')
    expect(matchesOnlyFilter(filter, '@socketregistry/own-keys')).toBe(true)
    expect(matchesOnlyFilter(filter, '@socketregistry/is-data-view')).toBe(true)
    expect(matchesOnlyFilter(filter, '@socketregistry/hasown')).toBe(false)
  })

  test('whitespace separates entries too', () => {
    const filter = parseOnlyFilter('own-keys  es-to-primitive')
    expect(filter.size).toBe(2)
    expect(matchesOnlyFilter(filter, '@socketregistry/es-to-primitive')).toBe(
      true,
    )
  })
})
