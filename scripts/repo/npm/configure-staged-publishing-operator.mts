/**
 * @file What the configurator does while it is WAITING ON A PERSON: the pause
 *   itself, and the Socket shield that asks for their attention.
 *   Both exist because of the same live failure. The fleet's shared
 *   `pauseForChallenge` is the right operator experience — it owns the 🖐 gate
 *   block, the desktop ping, the cross-call pause tracker, the progress cadence
 *   and the budget — but on a fresh pause it re-navigates to the URL. On a live
 *   run that reload closed the trusted-publisher form the write lane had just
 *   opened, and the resulting reload loop is itself the traffic shape npm's bot
 *   management answers with a challenge: settings page → form opens → reload →
 *   challenge → pause → reload, once per lap. So the pause here composes the
 *   same gate tick the fleet pause is built on and simply does not navigate.
 *   The overlay is the other half of the same moment. When a person genuinely
 *   has to act, the shield says so from the middle of the window instead of
 *   from a terminal they are not looking at. It is garnish and is written that
 *   way: every failure swallowed, nothing load-bearing behind it.
 *   The same best-effort layer keeps the driven window legible: npm's stacked
 *   site-notification banners get dismissed once the page is settled, and stray
 *   `about:blank` tabs get closed so the run drives ONE page. Neither is ever a
 *   readiness signal — the payload decides that — but a session juggling pages
 *   can poll the wrong one, so the page being polled is asserted to be the one
 *   holding the access URL.
 */

import { getDefaultLogger } from '@socketsecurity/lib-stable/logger/default'
import { sleep } from '@socketsecurity/lib-stable/promises/timers'

import type { Page } from 'playwright-core'

import { optIntoChallengeCooldown } from '../../fleet/publish-infra/npm/browser-session.mts'
import { tickChallengeGate } from '../../fleet/publish-infra/npm/challenge-gate.mts'
import {
  buildOperatorOverlayInjectionScript,
  buildOperatorOverlayRemovalScript,
  shouldShowOperatorOverlay,
} from './configure-staged-publishing-overlay.mts'

import type { AccessPageReadiness } from './configure-staged-publishing-session.mts'

const logger = getDefaultLogger()

/**
 * The operator wait a caller can substitute. One tick: announce if this is a
 * fresh pause, keep the cooldown opt-in ticked, sleep. Injected rather than
 * imported at the call site so a wait loop's no-navigation invariant is
 * testable with a fake page and no gate files.
 */
export type OperatorPause = (config: {
  budgetMs: number
  elapsedMs: number
  label: string
  pollMs: number
  url: string
}) => Promise<void>

/**
 * Show the Socket shield over the page while a person is needed.
 *
 * Idempotent: the script returns early when the element is already there, so a
 * poll loop calling this every tick injects once and then does nothing.
 * Entirely best-effort — every failure is swallowed, because a page that
 * refuses evaluation is a page the run should keep waiting on, not one it
 * should abandon over a missing decoration.
 */
export async function showOperatorOverlay(page: Page): Promise<void> {
  try {
    await page.evaluate(buildOperatorOverlayInjectionScript())
  } catch {}
}

/**
 * Take the shield back down. Called whenever readiness is not a state a person
 * clears, so a navigation that dropped the overlay and a challenge that cleared
 * both end the same way.
 */
export async function removeOperatorOverlay(page: Page): Promise<void> {
  try {
    await page.evaluate(buildOperatorOverlayRemovalScript())
  } catch {}
}

/**
 * Keep the overlay in sync with one readiness reading — injected during a real
 * challenge or step-up, removed otherwise.
 */
export async function syncOperatorOverlay(
  page: Page,
  readiness: AccessPageReadiness,
): Promise<void> {
  if (shouldShowOperatorOverlay(readiness)) {
    await showOperatorOverlay(page)
    return
  }
  await removeOperatorOverlay(page)
}

/**
 * Npm's stacked site notifications and their close controls, as the live page
 * renders them: a `Site notifications` landmark holding one `alert-banner` per
 * notice, each with its own close button. There can be more than one — the
 * provenance-fetch error arrives as a second banner under the two-factor
 * restriction warning.
 *
 * Attributes ONLY. Every classname in that markup is build-hashed
 * (`_1a444dba`, `ec35f4a7`, and so on) and rotates on every npm deploy, so a
 * selector built on one is broken by design — the same rule the access-page
 * schema follows for chunk filenames and `integrity=` digests. The ARIA labels
 * and `data-test-id` are the parts npm maintains as contracts.
 */
export const SITE_NOTIFICATION_CLOSE_SELECTOR =
  'section[aria-label="Site notifications"] div[data-test-id="alert-banner"] button[aria-label="Close notification"]'

/**
 * Dismiss npm's site-notification banners in the driven window, and report how
 * many were closed.
 *
 * Purely cosmetic, and deliberately kept that way. The banners are what a
 * text-matching challenge detector used to trip over, but the fix for THAT is
 * that the payload decides readiness — dismissing them is about the operator's
 * view, not the classifier's. So this is never a readiness signal, never gates
 * anything, and every failure is swallowed: a banner that refuses to close is a
 * cluttered window, not a failed run.
 */
export async function dismissSiteNotifications(page: Page): Promise<number> {
  let closed = 0
  try {
    const buttons = page.locator(SITE_NOTIFICATION_CLOSE_SELECTOR)
    const count = await buttons.count()
    for (let i = 0; i < count; i += 1) {
      try {
        // Always the FIRST one: closing a banner removes it from the list, so
        // the remaining stack shifts down and an index-based walk would skip
        // every other notice.
        // eslint-disable-next-line no-await-in-loop -- serial: each close mutates the list the next read sees.
        await buttons.first().click({ timeout: 2000 })
        closed += 1
      } catch {
        break
      }
    }
  } catch {}
  return closed
}

/**
 * Close every stray `about:blank` page in `page`'s context, keeping the one
 * being driven, and report how many were closed.
 *
 * ONE page for the whole run is the contract. A persistent-context launch hands
 * back an initial blank page, and a run that opens its own on top of it leaves
 * the operator looking at a spare tab carrying Chrome's automation infobar —
 * and, worse, leaves the session juggling pages, where a wait loop can end up
 * polling one while the form sits on another. Cosmetic to look at, not cosmetic
 * to get wrong, which is why {@link isPolledPageOnTarget} exists beside it.
 */
export async function closeStrayBlankPages(page: Page): Promise<number> {
  let closed = 0
  try {
    const pages = page.context().pages()
    for (const other of pages) {
      if (other === page || other.url() !== 'about:blank') {
        continue
      }
      try {
        // eslint-disable-next-line no-await-in-loop -- serial: one page closes at a time.
        await other.close()
        closed += 1
      } catch {}
    }
  } catch {}
  return closed
}

/**
 * Whether the page about to be polled is the one holding this package's access
 * URL, or a page that has not navigated yet.
 *
 * `about:blank` passes: the first tick navigates, so a fresh page legitimately
 * reports nothing yet. A page sitting on some OTHER npm URL does not — that is
 * the session driving a tab nobody meant it to, and polling it would classify
 * the wrong page's body as this package's settings.
 */
export function isPolledPageOnTarget(
  pageUrl: string,
  settingsUrl: string,
): boolean {
  if (!pageUrl || pageUrl === 'about:blank') {
    return true
  }
  return pageUrl.split('?')[0] === settingsUrl.split('?')[0]
}

/**
 * One tick of the operator pause, WITHOUT the fleet pause's reload. The window
 * is brought forward instead, which gets the operator's attention without
 * touching the page's state.
 *
 * @throws {Error} When the challenge outlasts its budget.
 */
export async function pauseForOperatorInPlace(config: {
  budgetMs: number
  elapsedMs: number
  label: string
  page: Page
  pollMs: number
  url: string
}): Promise<void> {
  const cfg = { __proto__: null, ...config } as typeof config
  const tick = await tickChallengeGate(cfg.page, {
    budgetMs: cfg.budgetMs,
    fallbackElapsedMs: cfg.elapsedMs,
    pkg: cfg.label,
    url: cfg.url,
  })
  if (tick.expiredMessage !== undefined) {
    throw new Error(tick.expiredMessage)
  }
  if (tick.freshPause) {
    logger.warn(
      `${cfg.label}: human verification is on screen. Solve it in the Chrome window — the run is waiting in place and will not reload the page.`,
    )
    await cfg.page.bringToFront().catch(() => {})
  }
  await optIntoChallengeCooldown(cfg.page)
  await sleep(cfg.pollMs)
}
