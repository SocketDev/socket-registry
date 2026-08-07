/**
 * @file Tests for the offline provenance comparison — every disagreement
 *   between a ported suite's lockstep row, its `.gitmodules` pin, its prose
 *   header, and its dependency spec, plus the in-sync cases that report
 *   nothing.
 */

import { describe, expect, test } from 'vitest'

import { findNpmPortProvenanceProblems } from '../../../../../scripts/repo/check/npm-port-provenance/problems.mts'

import type { NpmPortCheckInput } from '../../../../../scripts/repo/check/npm-port-provenance/records.mts'

import {
  GITMODULES_TEXT,
  makePins,
  makeRow,
  PORT_HEADER_SOURCE,
  PORTED_SHA,
  UPSTREAMS,
} from './fixtures.mts'

function makeInput(overrides?: Partial<NpmPortCheckInput>): NpmPortCheckInput {
  return {
    rows: [makeRow()],
    upstreams: UPSTREAMS,
    pins: makePins(),
    readPortSource: () => PORT_HEADER_SOURCE,
    devDependencies: { 'for-each': '0.3.5' },
    hasOverridePackage: () => true,
    ...overrides,
  } as NpmPortCheckInput
}

function whats(input: NpmPortCheckInput): string[] {
  return findNpmPortProvenanceProblems(input).map(p => p.what)
}

describe('in sync', () => {
  test('an in-sync port reports nothing', () => {
    expect(findNpmPortProvenanceProblems(makeInput())).toEqual([])
  })

  test('an archive dependency spec pinning the ported object passes', () => {
    expect(
      findNpmPortProvenanceProblems(
        makeInput({
          devDependencies: {
            'for-each': `https://github.com/Raynos/for-each/archive/${PORTED_SHA}.tar.gz`,
          },
        }),
      ),
    ).toEqual([])
  })
})

describe('SHA mismatch', () => {
  test('a .gitmodules ref that differs from forked_at_sha fails', () => {
    const problems = findNpmPortProvenanceProblems(
      makeInput({
        pins: makePins(
          GITMODULES_TEXT.replace(
            `ref = ${PORTED_SHA}`,
            () => `ref = ${'a'.repeat(40)}`,
          ),
        ),
      }),
    )
    expect(problems.map(p => p.what)).toContain(
      'the pinned ref disagrees with the SHA the port was forked at.',
    )
    expect(problems[0]?.fix).toContain('gen/gitmodules-hash.mts --set')
  })

  test('a header permalink pointing at another object fails', () => {
    expect(
      whats(
        makeInput({
          readPortSource: () =>
            PORT_HEADER_SOURCE.replaceAll(PORTED_SHA, () => 'b'.repeat(40)),
        }),
      ),
    ).toContain(
      'the header permalink points at a different object than the port record.',
    )
  })

  test('an inline short SHA that is not a prefix of the ported object fails', () => {
    expect(
      whats(
        makeInput({
          readPortSource: () =>
            PORT_HEADER_SOURCE.replace(
              `v0.3.5 (${PORTED_SHA})`,
              'v0.3.5 (deadbee)',
            ),
        }),
      ),
    ).toContain(
      "the header's inline short SHA is not a prefix of the ported object id.",
    )
  })

  test('an archive dependency spec pinning another object fails', () => {
    expect(
      whats(
        makeInput({
          devDependencies: {
            'for-each': `https://github.com/Raynos/for-each/archive/${'c'.repeat(40)}.tar.gz`,
          },
        }),
      ),
    ).toContain(
      'the archive dependency spec pins a different object than the port record.',
    )
  })
})

describe('unresolvable inputs fail loudly', () => {
  test('a row naming an undeclared upstream fails', () => {
    expect(whats(makeInput({ upstreams: {} }))).toContain(
      'the row names an upstream that the manifest does not declare.',
    )
  })

  test('a declared upstream with no .gitmodules block fails', () => {
    expect(whats(makeInput({ pins: [] }))).toContain(
      'the declared upstream has no reference block in .gitmodules.',
    )
  })

  test('a block missing shallow / sparse / sha256 fails', () => {
    const stripped = GITMODULES_TEXT.replace(/^# .*\n/, '')
      .replace('\tshallow = true\n', '')
      .replace('\tsparse-checkout = test/\n', '')
    const problem = findNpmPortProvenanceProblems(
      makeInput({ pins: makePins(stripped) }),
    ).find(p => p.what.includes('not a pinned sparse shallow reference'))
    expect(problem?.saw).toContain('shallow = true')
    expect(problem?.saw).toContain('sparse-checkout')
    expect(problem?.saw).toContain('sha256')
  })

  test('a block tracking a moving ref rather than a release tag fails', () => {
    expect(
      whats(
        makeInput({
          pins: makePins(
            GITMODULES_TEXT.replace('branch = v0.3.5', 'branch = main'),
          ),
        }),
      ),
    ).toContain(
      'the upstream reference tracks a moving ref rather than a release tag.',
    )
  })

  test('a missing ported suite fails', () => {
    expect(whats(makeInput({ readPortSource: () => undefined }))).toContain(
      'the ported suite the row points at does not exist.',
    )
  })

  test('a ported suite with no provenance header fails', () => {
    expect(
      whats(makeInput({ readPortSource: () => '/** @file Plain. */\n' })),
    ).toContain(
      'the ported suite carries no machine-readable provenance header.',
    )
  })

  test('a header naming a different upstream repository fails', () => {
    expect(
      whats(
        makeInput({
          readPortSource: () =>
            PORT_HEADER_SOURCE.replace(
              'github.com/Raynos/for-each/blob',
              'github.com/other/for-each/blob',
            ),
        }),
      ),
    ).toContain(
      'the header permalink names a different upstream repository than the manifest.',
    )
  })

  test('a header naming a different upstream file fails', () => {
    expect(
      whats(makeInput({ rows: [makeRow({ upstream_path: 'test/other.js' })] })),
    ).toContain(
      'the header permalink names a different upstream file than the port record.',
    )
  })

  test('a header version that is not the pinned release tag fails', () => {
    expect(
      whats(
        makeInput({
          readPortSource: () =>
            PORT_HEADER_SOURCE.replaceAll('v0.3.5', 'v0.3.4'),
        }),
      ),
    ).toContain(
      'the header names a different upstream version than the pinned release tag.',
    )
  })

  test('a ported suite with no override package fails', () => {
    expect(whats(makeInput({ hasOverridePackage: () => false }))).toContain(
      'the ported suite has no override package to exercise.',
    )
  })

  test('an unpinned dependency fails', () => {
    expect(whats(makeInput({ devDependencies: {} }))).toContain(
      'the ported package is not pinned in the conformance fixture manifest.',
    )
  })

  test('a dependency spec on another release fails', () => {
    const problem = findNpmPortProvenanceProblems(
      makeInput({ devDependencies: { 'for-each': '0.3.3' } }),
    ).find(p => p.what.includes('disagrees with the pinned upstream release'))
    expect(problem?.saw).toBe('spec 0.3.3, pin v0.3.5')
    expect(problem?.fix).toContain('"0.3.5"')
  })
})
