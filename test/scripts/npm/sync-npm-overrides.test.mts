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
      expect(prompt).toContain('INCLUDE_NPM_TESTS=1 pnpm exec vitest run')
      expect(prompt).toContain('Do not bump any package versions')
    })
  })
})
