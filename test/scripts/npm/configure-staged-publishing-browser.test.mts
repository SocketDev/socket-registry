/**
 * @file Tests for the wait loop's NO-NAVIGATION invariant, driven through a
 *   fake page that counts `goto` calls.
 *   This is the test for a live failure with a cost. The fleet's shared
 *   challenge pause reloads the page on every fresh pause, and the fleet's form
 *   driver re-navigates on every attempt. Together they produced a loop: the
 *   settings page loaded, the trusted-publisher form opened, a reload closed
 *   it, a challenge appeared, the pause reloaded again — with
 *   "form opened via edit-button" printing once per lap. The reloads were also
 *   the CAUSE, since a rapid reload loop against npm's bot management is the
 *   traffic shape that earns a real interstitial.
 *   So the invariant is worth an assertion rather than a comment: after the one
 *   navigation that opens the access page, the wait never navigates again, no
 *   matter how many challenge, step-up, or sign-in ticks it goes through.
 */

import { describe, expect, test } from 'vitest'

import { waitForAccessPage } from '../../../scripts/repo/npm/configure-staged-publishing-browser.mts'

import type { StagedConfigurationTarget } from '../../../scripts/repo/npm/configure-staged-publishing-plan.mts'
import type { Page } from 'playwright-core'

const ACCESS_URL = 'https://www.npmjs.com/package/@socketregistry/abab/access'

const TARGET: StagedConfigurationTarget = {
  latestVersion: '1.0.9',
  name: '@socketregistry/abab',
  publishedVersionCount: 3,
  settingsUrl: ACCESS_URL,
}

// A settled access page, banners and all — the state the live run kept
// misreading as a challenge.
const READY_BODY = `${JSON.stringify({
  context: { canEditPackage: true, oidcConnections: [] },
})}<div role="alert" class="alert">npm tokens that bypass 2FA are being restricted</div>`

const CHALLENGE_BODY = '<html><head><title>Just a moment…</title></head></html>'

interface FakePage {
  gotoCount: number
  page: Page
}

// The narrowest page a wait loop touches: navigate, settle, fetch, report a
// URL, come to the front. Enough to drive the loop; nothing that needs a
// browser.
//
// It also carries what the DELEGATED fleet pause touches, so a test can drive
// the real pause instead of injecting one: an empty `locator` for the
// cooldown-opt-in probe, and a `mainFrame` whose `evaluate` swallows the
// holding-screen source. The screen is injected through the frame rather than
// `page.evaluate` precisely so it cannot eat a body sequence, and this double
// keeps that separation honest.
function makeFakePage(bodies: readonly string[]): FakePage {
  const state = { gotoCount: 0, index: 0 }
  const page = {
    bringToFront: async () => {},
    // The overlay is injected as a SOURCE STRING and the probe as a function;
    // only the probe advances the script, so overlay ticks cannot skew a body
    // sequence this test is asserting against.
    evaluate: async (fn: unknown) => {
      if (typeof fn === 'string') {
        return undefined
      }
      const body = bodies[Math.min(state.index, bodies.length - 1)]!
      state.index += 1
      return { body, fetchUrl: ACCESS_URL, status: 200 }
    },
    goto: async () => {
      state.gotoCount += 1
      return undefined
    },
    // No controls on the page: the cooldown opt-in and the notification
    // banners both read as absent, which is a quiet no-op in each.
    locator: () => ({
      count: async () => 0,
      first: () => ({
        check: async () => {},
        click: async () => {},
        isChecked: async () => false,
      }),
    }),
    mainFrame: () => ({ evaluate: async () => undefined }),
    url: () => ACCESS_URL,
    waitForLoadState: async () => {},
  } as unknown as Page
  return {
    get gotoCount() {
      return state.gotoCount
    },
    page,
  }
}

describe('waitForAccessPage navigation', () => {
  test('a page that is ready on the first probe navigates exactly once', async () => {
    const fake = makeFakePage([READY_BODY])
    const probe = await waitForAccessPage(fake.page, TARGET, {
      budgetMs: 5000,
      pollMs: 1,
    })
    expect(probe.status).toBe(200)
    expect(fake.gotoCount).toBe(1)
  })

  test('challenge ticks never navigate again', async () => {
    // Three challenge probes, then the settled page. A pause that reloaded
    // would show up here as four navigations instead of one — and on the real
    // page each of those reloads is what closed the form.
    const fake = makeFakePage([
      CHALLENGE_BODY,
      CHALLENGE_BODY,
      CHALLENGE_BODY,
      READY_BODY,
    ])
    let pauses = 0
    await waitForAccessPage(fake.page, TARGET, {
      budgetMs: 5000,
      pause: async () => {
        pauses += 1
      },
      pollMs: 1,
    })
    expect(pauses).toBe(3)
    expect(fake.gotoCount).toBe(1)
  })

  test('`navigate: false` performs no navigation at all', async () => {
    // For a caller whose page is already sitting on the access page — the write
    // lane's re-read, which must never disturb an open form.
    const fake = makeFakePage([READY_BODY])
    await waitForAccessPage(fake.page, TARGET, {
      budgetMs: 5000,
      navigate: false,
      pollMs: 1,
    })
    expect(fake.gotoCount).toBe(0)
  })

  test('the DELEGATED fleet pause never navigates either', async () => {
    // The invariant, asserted against the pause the run actually uses rather
    // than an injected stand-in. Every other test here hands in a fake `pause`,
    // which proves the loop's own restraint but says nothing about the pause it
    // delegates to — and this module used to hand-copy that pause for exactly
    // one reason: the fleet's version reloaded the URL on every fresh pause,
    // which closed the trusted-publisher form and provoked more challenges.
    // The fleet pause now waits in place, so the copy is gone; if it ever
    // regains a `goto`, this is the test that says so instead of a live run.
    const fake = makeFakePage([
      CHALLENGE_BODY,
      CHALLENGE_BODY,
      CHALLENGE_BODY,
      READY_BODY,
    ])
    await waitForAccessPage(fake.page, TARGET, { budgetMs: 5000, pollMs: 1 })
    expect(fake.gotoCount).toBe(1)
  })

  test('a banner-laden access page resolves without ever pausing', async () => {
    // The false positive, end to end: the run used to announce human
    // verification against this exact body and wait out its whole budget.
    const fake = makeFakePage([READY_BODY])
    let pauses = 0
    await waitForAccessPage(fake.page, TARGET, {
      budgetMs: 5000,
      pause: async () => {
        pauses += 1
      },
      pollMs: 1,
    })
    expect(pauses).toBe(0)
  })
})
