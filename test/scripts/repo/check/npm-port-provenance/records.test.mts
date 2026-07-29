/**
 * @file Tests for the pure provenance readers — port-header parsing, port-row
 *   collection, `.gitmodules` pin merging, package/slug/version derivation,
 *   release-tag ordering, and the problem renderer. No filesystem, no network.
 */

import { describe, expect, test } from 'vitest'

import {
  collectNpmPortRows,
  formatNpmPortProblem,
  measureReleaseCurrency,
  mergeGitmodulesPins,
  normalizeVersionTag,
  npmPortPackageName,
  parseLsRemoteTags,
  parseNpmPortHeader,
  releaseTagVersion,
  sortReleaseTags,
  upstreamRepoSlug,
} from '../../../../../scripts/repo/check/npm-port-provenance/records.mts'

import type { NpmPortPin } from '../../../../../scripts/repo/check/npm-port-provenance/records.mts'

import {
  GITMODULES_TEXT,
  makeRow,
  PORT_HEADER_SOURCE,
  PORTED_SHA,
} from './fixtures.mts'

describe('parseNpmPortHeader', () => {
  test('reads a wrapped header with a full inline SHA', () => {
    expect(parseNpmPortHeader(PORT_HEADER_SOURCE)).toEqual({
      version: '0.3.5',
      inlineSha: PORTED_SHA,
      owner: 'Raynos',
      repo: 'for-each',
      permalinkSha: PORTED_SHA,
      upstreamPath: 'test/test.js',
    })
  })

  test('reads a header whose inline SHA is abbreviated', () => {
    const source = PORT_HEADER_SOURCE.replace(
      `v0.3.5 (${PORTED_SHA})`,
      'v0.3.5 (45229651)',
    )
    expect(parseNpmPortHeader(source)?.inlineSha).toBe('45229651')
  })

  test('returns undefined when the file carries no ported clause', () => {
    expect(parseNpmPortHeader('/** @file Plain suite. */\n')).toBeUndefined()
  })

  test('returns undefined when there is no block comment at all', () => {
    expect(
      parseNpmPortHeader('import { describe } from "vitest"\n'),
    ).toBeUndefined()
  })
})

describe('record readers', () => {
  test('collects only file-fork rows under test/npm/', () => {
    const rows = collectNpmPortRows({
      rows: [
        makeRow(),
        makeRow({ id: 'other-fork', local: 'scripts/repo/vendored.mts' }),
        { kind: 'version-pin', id: 'a-pin', upstream: 'Raynos-for-each' },
      ],
    } as never)
    expect(rows.map(r => r.id)).toEqual(['npm-port-for-each'])
  })

  test('merges the pinned ref onto the parsed block shape', () => {
    const pins = mergeGitmodulesPins(GITMODULES_TEXT)
    expect(pins).toHaveLength(1)
    const pin = pins[0] as NpmPortPin
    expect(pin.ref).toBe(PORTED_SHA)
    expect(pin.branch).toBe('v0.3.5')
    expect(pin.shallow).toBe(true)
    expect(pin.sparse).toBe('test/')
    expect(pin.headerSha).toBe('4'.repeat(64))
  })

  test('derives the override package name from the suite path', () => {
    expect(npmPortPackageName('test/npm/for-each.test.mts')).toBe('for-each')
  })

  test('derives the owner/repo slug with or without a .git suffix', () => {
    expect(upstreamRepoSlug('https://github.com/Raynos/for-each')).toBe(
      'Raynos/for-each',
    )
    expect(upstreamRepoSlug('https://github.com/Raynos/for-each.git')).toBe(
      'Raynos/for-each',
    )
    expect(upstreamRepoSlug('https://example.com/no-slug')).toBeUndefined()
  })

  test('strips the v prefix off a release tag', () => {
    expect(normalizeVersionTag('v1.2.3')).toBe('1.2.3')
    expect(normalizeVersionTag('2.2.0')).toBe('2.2.0')
  })

  test('renders the four-ingredient error block', () => {
    const rendered = formatNpmPortProblem({
      id: 'npm-port-for-each',
      what: 'a thing broke.',
      where: 'a place',
      saw: 'this',
      wanted: 'that',
      fix: 'do it',
    })
    expect(rendered).toContain('What:   a thing broke.')
    expect(rendered).toContain('Where:  a place')
    expect(rendered).toContain('Saw:    this')
    expect(rendered).toContain('Wanted: that')
    expect(rendered).toContain('Fix:    do it')
  })
})

describe('release-tag ordering', () => {
  test('parses tag names off ls-remote output and collapses peeled refs', () => {
    const output = [
      '288eb0bc\trefs/tags/v0.3.5',
      '45229651\trefs/tags/v0.3.5^{}',
      'aaaaaaa\trefs/tags/v0.3.4',
    ].join('\n')
    expect(parseLsRemoteTags(output).toSorted()).toEqual(['v0.3.4', 'v0.3.5'])
  })

  test('sorts release tags numerically and drops non-release refs', () => {
    expect(
      sortReleaseTags(['v1.10.0', 'v1.9.0', 'v2.0.0-rc.1', 'latest', '1.2']),
    ).toEqual(['1.2', 'v1.9.0', 'v1.10.0'])
  })

  test('reads a release tag version triple', () => {
    expect(releaseTagVersion('v1.2.3')).toEqual([1, 2, 3])
    expect(releaseTagVersion('2.2')).toEqual([2, 2, 0])
    expect(releaseTagVersion('main')).toBeUndefined()
  })

  test('reports zero behind when the pin is the newest release', () => {
    expect(measureReleaseCurrency('v1.3.2', ['v1.3.1', 'v1.3.2'])).toEqual({
      newest: 'v1.3.2',
      behind: 0,
    })
  })

  test('reports how far behind the newest release the pin is', () => {
    expect(
      measureReleaseCurrency('v1.3.2', ['v1.3.2', 'v1.3.3', 'v1.4.0']),
    ).toEqual({ newest: 'v1.4.0', behind: 2 })
  })

  test('reports an unknown pin as behind -1 rather than clean', () => {
    expect(measureReleaseCurrency('v9.9.9', ['v1.0.0'])).toEqual({
      newest: 'v1.0.0',
      behind: -1,
    })
  })

  test('reports no newest release when the upstream publishes none', () => {
    expect(measureReleaseCurrency('main', ['nightly'])).toEqual({
      newest: undefined,
      behind: -1,
    })
  })
})
