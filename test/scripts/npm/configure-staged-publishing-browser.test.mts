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
