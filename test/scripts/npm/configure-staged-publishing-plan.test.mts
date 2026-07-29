/**
 * @file Tests for the staged-publishing configurator's pure layer: the plan
 *   derived from the check's reports, the idempotency decision read off npm's
 *   settings payload, and the challenge/sign-in classification.
 *   The load-bearing case is `readAllowedActions` returning `undefined` for a
 *   payload it cannot parse. npm's trusted-publisher JSON key names are not a
 *   contract, so an unrecognized payload must read as "could not determine" and
 *   stop the run — reading it as "no actions configured" would send a write at
 *   a page nobody has verified.
 */

import { describe, expect, test } from 'vitest'

import {
  buildPackageAccessUrl,
  classifyStagedFetch,
  decideStagedConfigurationAction,
  formatChallengeTimeout,
  formatChallengeWait,
  formatUnreadableSettings,
  isSignInRedirect,
  permitsStagedPublish,
  planStagedConfiguration,
  readAllowedActions,
} from '../../../scripts/npm/configure-staged-publishing-plan.mts'

import type { StagedTrustReport } from '../../../scripts/npm/check-trusted-packages-staged.mts'

function reportOf(
  name: string,
  verdict: StagedTrustReport['verdict'],
  latestVersion?: string | undefined,
): StagedTrustReport {
  return {
    latestVersion,
    manifestVersion: undefined,
    manifestVersionIsPublished: latestVersion !== undefined,
    name,
    publishedVersionCount: latestVersion === undefined ? 0 : 1,
    stagedVersionCount: verdict === 'staged' ? 1 : 0,
    verdict,
  }
}

describe('buildPackageAccessUrl / isSignInRedirect', () => {
  test('builds the package settings URL', () => {
    expect(buildPackageAccessUrl('@socketregistry/date')).toBe(
      'https://www.npmjs.com/package/@socketregistry/date/access',
    )
  })

  test('recognizes npm’s sign-in redirect', () => {
    expect(
      isSignInRedirect(
        'https://www.npmjs.com/login?next=%2Fpackage%2F%40socketregistry%2Fdate%2Faccess',
      ),
    ).toBe(true)
    expect(
      isSignInRedirect(
        'https://www.npmjs.com/package/@socketregistry/date/access',
      ),
    ).toBe(false)
  })
})

describe('planStagedConfiguration', () => {
  test('targets only the not-staged reports, sorted', () => {
    const plan = planStagedConfiguration([
      reportOf('@socketregistry/zebra', 'not-staged', '1.0.0'),
      reportOf('@socketregistry/already', 'staged', '1.0.0'),
      reportOf('@socketregistry/abab', 'not-staged', '1.0.9'),
      reportOf('@socketregistry/pending', 'unpublished'),
    ])
    expect(plan.map(t => t.name)).toEqual([
      '@socketregistry/abab',
      '@socketregistry/zebra',
    ])
    expect(plan[0]!.settingsUrl).toBe(
      'https://www.npmjs.com/package/@socketregistry/abab/access',
    )
    expect(plan[0]!.latestVersion).toBe('1.0.9')
  })

  test('a configured package drops out of the plan, making a re-run a no-op', () => {
    const before = planStagedConfiguration([
      reportOf('@socketregistry/date', 'not-staged', '1.0.8'),
    ])
    expect(before).toHaveLength(1)
    const after = planStagedConfiguration([
      reportOf('@socketregistry/date', 'staged', '1.0.9'),
    ])
    expect(after).toHaveLength(0)
  })
})

describe('readAllowedActions', () => {
  test('reads an array of action tokens', () => {
    const actions = readAllowedActions({
      trustedPublisher: {
        allowedActions: ['npm publish', 'npm stage publish'],
      },
    })
    expect(actions).toBeDefined()
    expect(permitsStagedPublish(actions!)).toBe(true)
  })

  test('reads a boolean map keyed by action token', () => {
    const actions = readAllowedActions({
      package: {
        trustedPublisher: {
          allowedActions: { stagePublish: true, publish: false },
        },
      },
    })
    expect(actions).toBeDefined()
    expect(permitsStagedPublish(actions!)).toBe(true)
  })

  test('reports direct-publish-only as needing configuration', () => {
    const actions = readAllowedActions({ allowed_actions: ['npm publish'] })
    expect(actions).toBeDefined()
    expect(permitsStagedPublish(actions!)).toBe(false)
    expect(decideStagedConfigurationAction(actions)).toBe('configure')
  })

  test('an unrecognized payload is undefined, never an empty set', () => {
    expect(
      readAllowedActions({ some: 'other', page: { of: 'json' } }),
    ).toBeUndefined()
    expect(readAllowedActions(undefined)).toBeUndefined()
    expect(readAllowedActions('a string')).toBeUndefined()
    expect(decideStagedConfigurationAction(undefined)).toBe('unreadable')
  })

  test('an already-configured package is skipped, so a second run is idempotent', () => {
    const actions = readAllowedActions({
      trustedPublisher: { allowedActions: ['npm stage publish'] },
    })
    expect(decideStagedConfigurationAction(actions)).toBe('already-configured')
  })
})

describe('classifyStagedFetch', () => {
  test('a Cloudflare interstitial served as 200 HTML is a challenge, not JSON', () => {
    expect(
      classifyStagedFetch({
        body: '<html><head><title>Just a moment…</title></head></html>',
        status: 200,
      }),
    ).toBe('challenge')
  })

  test('a signed-out response is auth, not a challenge', () => {
    expect(classifyStagedFetch({ body: '{}', status: 403 })).toBe('auth')
  })

  test('a JSON body is ok', () => {
    expect(classifyStagedFetch({ body: '{"a":1}', status: 200 })).toBe('ok')
  })
})

describe('operator-facing messages', () => {
  test('the challenge wait line reports elapsed and remaining time', () => {
    const line = formatChallengeWait({
      budgetMs: 600_000,
      elapsedMs: 30_000,
      url: 'https://www.npmjs.com/package/@socketregistry/date/access',
    })
    expect(line).toContain('30s elapsed')
    expect(line).toContain('570s before this run gives up')
    expect(line).toContain('resumes on its own')
  })

  test('the challenge timeout block says nothing was changed', () => {
    const block = formatChallengeTimeout({
      budgetMs: 600_000,
      url: 'https://www.npmjs.com/package/@socketregistry/date/access',
    })
    const lines = block.split('\n')
    expect(lines[0]).toMatch(/^What: /)
    expect(lines[1]).toMatch(/^Where: /)
    expect(lines[2]).toMatch(/^Saw: /)
    expect(lines[3]).toMatch(/^Wanted: /)
    expect(lines[4]).toMatch(/^Fix: /)
    expect(block).toContain('Nothing was changed')
  })

  test('the unreadable-settings block follows What / Where / Saw / Wanted / Fix', () => {
    const lines = formatUnreadableSettings(
      {
        latestVersion: '1.0.8',
        name: '@socketregistry/date',
        settingsUrl:
          'https://www.npmjs.com/package/@socketregistry/date/access',
      },
      'npm answered HTTP 500.',
    ).split('\n')
    expect(lines[0]).toMatch(/^What: /)
    expect(lines[1]).toMatch(/^Where: /)
    expect(lines[2]).toMatch(/^Saw: /)
    expect(lines[3]).toMatch(/^Wanted: /)
    expect(lines[4]).toMatch(/^Fix: /)
  })
})
