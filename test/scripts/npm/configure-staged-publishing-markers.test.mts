/**
 * @file Tests for the staged-publishing configurator's page markers. Two live
 *   failures are pinned here. The first is that "Just a moment…" is not a
 *   literal — npm and Cloudflare render it with a Unicode ellipsis, with three
 *   ASCII dots, with no trailing punctuation, and in any case, so the phrase is
 *   normalized before it is matched. The second is that a settled access page
 *   carries npm's own dismissable notice banners, and a detector reading their
 *   copy scored them as human-verification text — which made a run announce
 *   "waiting on human verification" and wait out its full ten-minute budget
 *   while the trusted-publisher form sat open underneath.
 */

import { describe, expect, test } from 'vitest'

import {
  hasHumanVerificationMarkers,
  hasSettingsPayloadMarkers,
  normalizeChallengeText,
  stripDismissableBanners,
} from '../../../scripts/repo/npm/configure-staged-publishing-markers.mts'

// The four spellings of one phrase. Enumerating them as regexes is the bug this
// normalization replaces; enumerating them as TEST INPUT is the point.
const JUST_A_MOMENT_FORMS = [
  'Just a moment…',
  'Just a moment…',
  'Just a moment',
  'JUST A MOMENT…',
] as const

// The two banners the live access page rendered, verbatim in shape if not in
// full copy: the 2026 two-factor token restriction, and a provenance fetch that
// failed. Both are dismissable notices on a page that is perfectly readable.
const TWO_FACTOR_BANNER =
  '<div role="alert" class="alert alert-warning">npm tokens that bypass 2FA are being restricted — ' +
  'account changes (Aug 2026) and direct publishing (Jan 2027)</div>'
const PROVENANCE_BANNER =
  '<div class="banner banner-error">Failed to fetch provenance details for ' +
  '@socketregistry/abab@1.0.9. Please try reloading the page.</div>'

const ACCESS_PAYLOAD = JSON.stringify({
  context: {
    canEditPackage: true,
    oidcConnections: [
      {
        config: {
          environment_name: 'npm-publish',
          repository_name: 'socket-registry',
          repository_owner: 'SocketDev',
          workflow: 'npm-publish-packages.yml',
        },
        permissions: ['createStagedPackage', 'createPackageVersion'],
      },
    ],
  },
})

describe('normalizeChallengeText', () => {
  test('every ellipsis spelling and case collapses to one phrase', () => {
    for (const form of JUST_A_MOMENT_FORMS) {
      expect(normalizeChallengeText(form)).toBe('just a moment')
    }
  })

  test('HTML entities for space and ellipsis resolve', () => {
    expect(normalizeChallengeText('Just&nbsp;a&nbsp;moment&hellip;')).toBe(
      'just a moment',
    )
    expect(normalizeChallengeText('Just a moment&#8230;')).toBe('just a moment')
  })

  test('a non-breaking space is whitespace like any other', () => {
    expect(normalizeChallengeText('Just a moment…')).toBe('just a moment')
  })

  test('empty text normalizes to empty rather than throwing', () => {
    expect(normalizeChallengeText('')).toBe('')
  })
})

describe('hasHumanVerificationMarkers', () => {
  test('recognizes all four spellings of the interstitial title', () => {
    for (const form of JUST_A_MOMENT_FORMS) {
      expect(
        hasHumanVerificationMarkers(
          `<html><head><title>${form}</title></head></html>`,
        ),
      ).toBe(true)
    }
  })

  test('recognizes the interstitial’s other copy and its scaffolding', () => {
    expect(
      hasHumanVerificationMarkers(
        '<p>Checking if the site connection is secure</p>',
      ),
    ).toBe(true)
    expect(hasHumanVerificationMarkers('<div>Verify you are human</div>')).toBe(
      true,
    )
    expect(
      hasHumanVerificationMarkers('<div id="cf-browser-verification"></div>'),
    ).toBe(true)
    expect(hasHumanVerificationMarkers('window._cf_chl_opt = {}')).toBe(true)
  })

  test('npm’s dismissable notice banners are not a challenge', () => {
    // Neither banner carries challenge copy, and neither should ever be able to
    // pause a run — the whole point of stripping the REGION rather than
    // blocklisting these two strings.
    expect(hasHumanVerificationMarkers(TWO_FACTOR_BANNER)).toBe(false)
    expect(hasHumanVerificationMarkers(PROVENANCE_BANNER)).toBe(false)
  })

  test('a page carrying the settings payload is never a challenge', () => {
    // The decisive rule. Even challenge copy on a page that also serves the
    // package's data means the data arrived, so there is nothing to wait for.
    expect(
      hasHumanVerificationMarkers(
        `${TWO_FACTOR_BANNER}${ACCESS_PAYLOAD}<title>Just a moment…</title>`,
      ),
    ).toBe(false)
  })

  test('an empty body is not a challenge', () => {
    expect(hasHumanVerificationMarkers('')).toBe(false)
  })
})

describe('stripDismissableBanners', () => {
  test('alert-role and banner-class regions come out', () => {
    expect(stripDismissableBanners(TWO_FACTOR_BANNER)).not.toContain('2FA')
    expect(stripDismissableBanners(PROVENANCE_BANNER)).not.toContain(
      'provenance',
    )
  })

  test('the page around a banner survives', () => {
    const body = `<main><h1>Trusted Publisher</h1>${TWO_FACTOR_BANNER}</main>`
    const stripped = stripDismissableBanners(body)
    expect(stripped).toContain('Trusted Publisher')
    expect(stripped).not.toContain('2FA')
  })
})

describe('hasSettingsPayloadMarkers', () => {
  test('npm’s own settings keys count', () => {
    expect(hasSettingsPayloadMarkers(ACCESS_PAYLOAD)).toBe(true)
    expect(hasSettingsPayloadMarkers('{"stagedPublishingEnabled":true}')).toBe(
      true,
    )
    expect(hasSettingsPayloadMarkers('{"publishingAccess":{}}')).toBe(true)
  })

  test('the rendered trusted-publisher form counts too', () => {
    // A form on screen is as good a receipt as the payload behind it, and it is
    // the state the live run was in while it waited.
    expect(
      hasSettingsPayloadMarkers('<input name="workflowName" value="">'),
    ).toBe(true)
    expect(
      hasSettingsPayloadMarkers(
        '<input type="checkbox" name="allowStagePublish">',
      ),
    ).toBe(true)
  })

  test('a challenge page and a step-up payload carry none of it', () => {
    expect(
      hasSettingsPayloadMarkers(
        '<html><head><title>Just a moment…</title></head></html>',
      ),
    ).toBe(false)
    expect(
      hasSettingsPayloadMarkers(
        '{"escalateType":"webauthn","hasTotp":true,"originalUrl":"/package/x/access"}',
      ),
    ).toBe(false)
    expect(hasSettingsPayloadMarkers('')).toBe(false)
  })
})
