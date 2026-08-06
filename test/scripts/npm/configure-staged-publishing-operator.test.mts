/**
 * @file Tests for the cosmetic operator layer: dismissing npm's site
 *   notifications in the driven window.
 *   The one thing worth pinning is that this layer is NOT load-bearing. The
 *   banners are what a text-matching challenge detector used to trip over, but
 *   the fix for that is that the payload decides readiness — closing them is
 *   about the operator's view. So a banner that refuses to close, a page that
 *   throws on a locator, and a page with no banners at all must all be quiet
 *   no-ops rather than anything a run notices.
 */

import { describe, expect, test } from 'vitest'

import {
  dismissSiteNotifications,
  isPolledPageOnTarget,
  SITE_NOTIFICATION_CLOSE_SELECTOR,
} from '../../../scripts/repo/npm/configure-staged-publishing-operator.mts'

import type { Page } from 'playwright-core'

// A page whose close buttons behave like the real stack: closing one removes it
// from the list, so a walk that always clicks the FIRST one drains it and an
// index-based walk would skip every other notice.
function makeBannerPage(config: {
  banners: number
  clickThrows?: boolean | undefined
  countThrows?: boolean | undefined
}): { clicks: number; page: Page; selector: string } {
  const state = { clicks: 0, remaining: config.banners, selector: '' }
  const page = {
    locator: (selector: string) => {
      state.selector = selector
      return {
        count: async () => {
          if (config.countThrows) {
            throw new Error('locator unavailable')
          }
          return state.remaining
        },
        first: () => ({
          click: async () => {
            if (config.clickThrows) {
              throw new Error('not clickable')
            }
            state.clicks += 1
            state.remaining -= 1
          },
        }),
      }
    },
  } as unknown as Page
  return {
    get clicks() {
      return state.clicks
    },
    page,
    get selector() {
      return state.selector
    },
  }
}

describe('dismissSiteNotifications', () => {
  test('closes every stacked banner', async () => {
    // Two on the live page: the two-factor token-restriction warning, and the
    // provenance-fetch error underneath it.
    const fake = makeBannerPage({ banners: 2 })
    expect(await dismissSiteNotifications(fake.page)).toBe(2)
    expect(fake.clicks).toBe(2)
  })

  test('a page with no banners is a quiet no-op', async () => {
    const fake = makeBannerPage({ banners: 0 })
    expect(await dismissSiteNotifications(fake.page)).toBe(0)
  })

  test('a banner that refuses to close is swallowed', async () => {
    const fake = makeBannerPage({ banners: 2, clickThrows: true })
    expect(await dismissSiteNotifications(fake.page)).toBe(0)
  })

  test('a page that throws on the locator is swallowed', async () => {
    const fake = makeBannerPage({ banners: 2, countThrows: true })
    expect(await dismissSiteNotifications(fake.page)).toBe(0)
  })

  test('it targets npm’s own notification landmark, not any close button', async () => {
    const fake = makeBannerPage({ banners: 1 })
    await dismissSiteNotifications(fake.page)
    expect(fake.selector).toBe(SITE_NOTIFICATION_CLOSE_SELECTOR)
    expect(SITE_NOTIFICATION_CLOSE_SELECTOR).toContain(
      'section[aria-label="Site notifications"]',
    )
    expect(SITE_NOTIFICATION_CLOSE_SELECTOR).toContain(
      'div[data-test-id="alert-banner"]',
    )
    expect(SITE_NOTIFICATION_CLOSE_SELECTOR).toContain(
      'button[aria-label="Close notification"]',
    )
  })

  test('the selector never keys on a build-hashed classname', () => {
    // Every classname in that markup rotates on each npm deploy, so a selector
    // built on one is broken by design — the same rule the access-page schema
    // follows for chunk filenames and integrity digests.
    expect(SITE_NOTIFICATION_CLOSE_SELECTOR).not.toContain('.')
    expect(SITE_NOTIFICATION_CLOSE_SELECTOR).not.toMatch(/class=/)
    expect(SITE_NOTIFICATION_CLOSE_SELECTOR).not.toMatch(/_[0-9a-f]{6,}/)
  })
})

describe('isPolledPageOnTarget', () => {
  const ACCESS_URL = 'https://www.npmjs.com/package/@socketregistry/abab/access'

  test('the page holding the access URL is on target', () => {
    expect(isPolledPageOnTarget(ACCESS_URL, ACCESS_URL)).toBe(true)
    expect(
      isPolledPageOnTarget(`${ACCESS_URL}?tab=publishing`, ACCESS_URL),
    ).toBe(true)
  })

  test('a page that has not navigated yet is on target', () => {
    // The first tick navigates, so a fresh page legitimately reports nothing.
    expect(isPolledPageOnTarget('about:blank', ACCESS_URL)).toBe(true)
    expect(isPolledPageOnTarget('', ACCESS_URL)).toBe(true)
  })

  test('a page sitting on another npm URL is NOT on target', () => {
    // A session juggling tabs would classify some other page's body as this
    // package's settings, and act on the answer.
    expect(
      isPolledPageOnTarget(
        'https://www.npmjs.com/package/@socketregistry/other/access',
        ACCESS_URL,
      ),
    ).toBe(false)
    expect(
      isPolledPageOnTarget(
        'https://www.npmjs.com/settings/socket-bot/packages',
        ACCESS_URL,
      ),
    ).toBe(false)
  })
})
