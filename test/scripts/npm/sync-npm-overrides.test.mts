/**
 * @file Unit tests for the override→upstream sync driver's pure core:
 *   version-pin classification (both arms of every status) and the
 *   lock-step prompt contract. No network, no AI spawns — the fetch and
 *   agent phases live behind the pure functions under test.
 */

import { describe, expect, it } from 'vitest'

import {
  buildSyncPrompt,
  classifyOverride,
  isExactSemver,
  newestSoakClearedVersion,
} from '../../../scripts/npm/sync-npm-overrides.mts'

function pin(pinnedSpec: string | undefined) {
  return {
    socketPkgName: '@socketregistry/is-number',
    upstreamName: 'is-number',
    pinnedSpec,
  }
}

describe('scripts/npm/sync-npm-overrides', () => {
  describe('isExactSemver', () => {
    it('accepts exact versions, including prereleases', () => {
      expect(isExactSemver('1.2.3')).toBe(true)
      expect(isExactSemver('7.0.0-rc.1')).toBe(true)
    })

    it('rejects ranges, tags, URLs, and non-strings', () => {
      expect(isExactSemver('^1.2.3')).toBe(false)
      expect(isExactSemver('latest')).toBe(false)
      expect(
        isExactSemver('https://github.com/jonschlinkert/is-number/tarball/x'),
      ).toBe(false)
      expect(isExactSemver(undefined)).toBe(false)
      expect(isExactSemver(123)).toBe(false)
    })
  })

  describe('classifyOverride', () => {
    it('is current when the pin equals the latest', () => {
      expect(classifyOverride(pin('7.0.0'), '7.0.0').status).toBe('current')
    })

    it('is current when the pin is ahead of the latest', () => {
      expect(classifyOverride(pin('7.1.0'), '7.0.0').status).toBe('current')
    })

    it('is stale when upstream published a newer version', () => {
      const drift = classifyOverride(pin('7.0.0'), '7.0.1')
      expect(drift.status).toBe('stale')
      expect(drift.latestVersion).toBe('7.0.1')
    })

    it('is unpinned without a devDependency spec', () => {
      expect(classifyOverride(pin(undefined), '7.0.1').status).toBe('unpinned')
    })

    it('is unpinnable for tarball-URL and range specs', () => {
      expect(
        classifyOverride(
          pin('https://github.com/jonschlinkert/is-number/tarball/x'),
          '7.0.1',
        ).status,
      ).toBe('unpinnable-spec')
      expect(classifyOverride(pin('^7.0.0'), '7.0.1').status).toBe(
        'unpinnable-spec',
      )
    })

    it('is unresolved when npm has no latest version', () => {
      expect(classifyOverride(pin('7.0.0'), undefined).status).toBe(
        'unresolved',
      )
    })

    it('judges staleness against the soak-cleared target, not raw latest', () => {
      const drift = classifyOverride(pin('7.0.1'), '7.0.1', '7.1.0')
      expect(drift.status).toBe('current')
      expect(drift.targetVersion).toBe('7.0.1')
      expect(drift.latestVersion).toBe('7.1.0')
    })

    it('defaults latestVersion to the target when not supplied', () => {
      const drift = classifyOverride(pin('7.0.0'), '7.0.1')
      expect(drift.latestVersion).toBe('7.0.1')
    })
  })

  describe('newestSoakClearedVersion', () => {
    const DAY_MS = 24 * 60 * 60 * 1000
    const nowMs = Date.parse('2026-07-12T00:00:00.000Z')
    const soak = {
      exclude: [] as readonly string[],
      nowMs,
      soakMinutes: 7 * 24 * 60,
      upstreamName: 'is-number',
    }
    const at = (daysAgo: number) =>
      new Date(nowMs - daysAgo * DAY_MS).toISOString()

    it('returns latest when it has cleared the soak window', () => {
      expect(
        newestSoakClearedVersion(
          '7.1.0',
          { '7.0.0': at(400), '7.1.0': at(30) },
          soak,
        ),
      ).toBe('7.1.0')
    })

    it('falls back to the newest cleared version while latest soaks', () => {
      expect(
        newestSoakClearedVersion(
          '7.2.0',
          { '7.0.0': at(400), '7.1.0': at(30), '7.2.0': at(2) },
          soak,
        ),
      ).toBe('7.1.0')
    })

    it('never targets a prerelease below latest', () => {
      expect(
        newestSoakClearedVersion(
          '7.1.0',
          { '7.0.0': at(400), '7.1.0-rc.1': at(30), '7.1.0': at(2) },
          soak,
        ),
      ).toBe('7.0.0')
    })

    it('ignores versions above latest and non-version time keys', () => {
      expect(
        newestSoakClearedVersion(
          '7.1.0',
          {
            created: at(500),
            modified: at(1),
            '7.1.0': at(30),
            '8.0.0-next.0': at(20),
          },
          soak,
        ),
      ).toBe('7.1.0')
    })

    it('lets a minimumReleaseAgeExclude entry bypass the soak', () => {
      const times = { '7.0.0': at(400), '7.1.0': at(1) }
      expect(
        newestSoakClearedVersion('7.1.0', times, {
          ...soak,
          exclude: ['is-number@7.1.0'],
        }),
      ).toBe('7.1.0')
      expect(
        newestSoakClearedVersion('7.1.0', times, {
          ...soak,
          exclude: ['is-number'],
        }),
      ).toBe('7.1.0')
    })

    it('returns latest verbatim when soak is off or metadata is degraded', () => {
      const times = { '7.1.0': at(1) }
      expect(
        newestSoakClearedVersion('7.1.0', times, { ...soak, soakMinutes: 0 }),
      ).toBe('7.1.0')
      expect(newestSoakClearedVersion('7.1.0', undefined, soak)).toBe('7.1.0')
      // Nothing cleared at all → surface latest for a human rather than
      // hiding the drift.
      expect(newestSoakClearedVersion('7.1.0', times, soak)).toBe('7.1.0')
      expect(newestSoakClearedVersion(undefined, times, soak)).toBeUndefined()
    })
  })

  describe('buildSyncPrompt', () => {
    const prompt = buildSyncPrompt({
      socketPkgName: '@socketregistry/is-number',
      upstreamName: 'is-number',
      fromVersion: '7.0.0',
      toVersion: '7.0.1',
    })

    it('names the exact upstream move and both code locations', () => {
      expect(prompt).toContain('is-number')
      expect(prompt).toContain('7.0.0 -> 7.0.1')
      expect(prompt).toContain('packages/npm/@socketregistry/is-number/')
      expect(prompt).toContain('test/npm/@socketregistry/is-number.test.mts')
    })

    it('states the lock-step contract with its governing docs', () => {
      expect(prompt).toContain('move together in this one change')
      expect(prompt).toContain('both arms')
      expect(prompt).toContain('docs/agents.md/fleet/test-layout.md')
      expect(prompt).toContain('docs/agents.md/fleet/code-is-law.md')
    })

    it('requires self-verification and forbids version bumps', () => {
      expect(prompt).toContain(
        'INCLUDE_NPM_TESTS=1 FORCE_TEST=1 pnpm exec vitest run',
      )
      expect(prompt).toContain('Do not bump any package versions')
    })
  })
})
