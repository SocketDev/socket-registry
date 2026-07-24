/**
 * @file Tests for the scripts/repo/bump.mts overlay — the monorepo bump the
 *   fleet npm-publish path resolves ahead of the canonical
 *   scripts/fleet/bump.mts. Covers the pure decision helpers — the
 *   publish-wiring guard that refuses a stageable private root, and the
 *   prepared-release target detection — plus the LIVE wiring assertion: this
 *   repo's actual root and subject manifests must satisfy the guard the
 *   overlay enforces, or the cascade-owned `pnpm stage publish` at the repo
 *   root uploads the private root instead of @socketsecurity/registry.
 */

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, test } from 'vitest'

import {
  preparedVersionFrom,
  SUBJECT_CHANGELOG_PATH,
  SUBJECT_MANIFEST_PATH,
  SUBJECT_NAME,
  subjectWiringError,
} from '../../../scripts/repo/bump.mts'

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..',
)

describe('bump overlay — subjectWiringError', () => {
  const goodRoot = {
    name: '@socketregistry/monorepo',
    private: true,
    publishConfig: { directory: 'registry' },
    version: '2.0.3',
  }

  test('accepts a private root that redirects publishes into the subject', () => {
    expect(subjectWiringError(goodRoot)).toBeUndefined()
  })

  test('refuses a root that is not private', () => {
    const error = subjectWiringError({ ...goodRoot, private: undefined })
    expect(error).toContain('"private": true')
  })

  test('refuses a root without the publishConfig.directory redirect', () => {
    const error = subjectWiringError({ ...goodRoot, publishConfig: undefined })
    expect(error).toContain('publishConfig.directory')
    expect(error).toContain(SUBJECT_NAME)
  })

  test('refuses a redirect pointing somewhere other than the subject', () => {
    const error = subjectWiringError({
      ...goodRoot,
      publishConfig: { directory: 'packages' },
    })
    expect(error).toContain('publishConfig.directory')
  })
})

describe('bump overlay — preparedVersionFrom', () => {
  const changelogWith = (version: string) =>
    `# Changelog\n\n## [${version}] - 2026-04-17\n\n### Changed\n\n- Something.\n`

  test('manifest ahead of base with its section committed is the target', () => {
    expect(
      preparedVersionFrom({
        base: '2.0.2',
        changelog: changelogWith('2.0.3'),
        manifestVersion: '2.0.3',
      }),
    ).toBe('2.0.3')
  })

  test('manifest equal to base is not a prepared release', () => {
    expect(
      preparedVersionFrom({
        base: '2.0.3',
        changelog: changelogWith('2.0.3'),
        manifestVersion: '2.0.3',
      }),
    ).toBeUndefined()
  })

  test('manifest ahead WITHOUT its changelog section is pre-bump drift', () => {
    expect(
      preparedVersionFrom({
        base: '2.0.2',
        changelog: changelogWith('2.0.2'),
        manifestVersion: '2.0.3',
      }),
    ).toBeUndefined()
  })

  test('a version-prefix section does not count as the prepared section', () => {
    // A 2.0.3 probe must not match a 2.0.30 heading.
    expect(
      preparedVersionFrom({
        base: '2.0.2',
        changelog: changelogWith('2.0.30'),
        manifestVersion: '2.0.3',
      }),
    ).toBeUndefined()
  })

  test('a MAJOR jump is never a prepared release — humans name majors', () => {
    expect(
      preparedVersionFrom({
        base: '2.0.2',
        changelog: changelogWith('3.0.0'),
        manifestVersion: '3.0.0',
      }),
    ).toBeUndefined()
  })

  test('a prerelease-suffixed manifest defers to the hint mechanism', () => {
    expect(
      preparedVersionFrom({
        base: '2.0.2',
        changelog: changelogWith('2.0.3'),
        manifestVersion: '2.0.3-prerelease',
      }),
    ).toBeUndefined()
  })

  test('a manifest behind base never re-targets an already-published version', () => {
    expect(
      preparedVersionFrom({
        base: '2.0.4',
        changelog: changelogWith('2.0.3'),
        manifestVersion: '2.0.3',
      }),
    ).toBeUndefined()
  })
})

describe('bump overlay — live repo wiring', () => {
  test('the real root manifest satisfies the publish-wiring guard', () => {
    const rootPkg = JSON.parse(
      readFileSync(path.join(repoRoot, 'package.json'), 'utf8'),
    )
    expect(subjectWiringError(rootPkg)).toBeUndefined()
  })

  test('the subject manifest exists, names the subject, and sits beside its changelog', () => {
    const subjectPkg = JSON.parse(
      readFileSync(path.join(repoRoot, SUBJECT_MANIFEST_PATH), 'utf8'),
    )
    expect(subjectPkg.name).toBe(SUBJECT_NAME)
    expect(subjectPkg.private).toBeUndefined()
    expect(typeof subjectPkg.version).toBe('string')
    expect(() =>
      readFileSync(path.join(repoRoot, SUBJECT_CHANGELOG_PATH), 'utf8'),
    ).not.toThrow()
  })

  test('the root version mirrors the subject version', () => {
    const rootPkg = JSON.parse(
      readFileSync(path.join(repoRoot, 'package.json'), 'utf8'),
    )
    const subjectPkg = JSON.parse(
      readFileSync(path.join(repoRoot, SUBJECT_MANIFEST_PATH), 'utf8'),
    )
    expect(rootPkg.version).toBe(subjectPkg.version)
  })
})
