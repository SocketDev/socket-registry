/**
 * @file Browser I/O for the staged-publishing configurator — the playwright
 *   half, isolated from the CLI so the pure planning layer in
 *   `./configure-staged-publishing-plan.mts` stays testable without a browser.
 *   Session handling mirrors
 *   `scripts/fleet/publish-infra/npm/staged-browser-read.mts`: a durable Chrome
 *   profile the operator signs into ONCE, in the window. No login is scripted,
 *   so no password, OTP, or session cookie ever passes through this process.
 *   The only auth signal read here is npm's own `/-/whoami`, and the only auth
 *   failure reported is "signed out". Cloudflare human-verification is expected
 *   and handled by PAUSING for the operator rather than retrying, since a blind
 *   retry ladder against a bot challenge earns a rate limit. Each poll prints
 *   how long the run has waited and how long remains, so the wait is visible
 *   rather than a silent hang, and nothing is written while a challenge is
 *   outstanding.
 */

import { errorMessage } from '@socketsecurity/lib-stable/errors/message'
import { getDefaultLogger } from '@socketsecurity/lib-stable/logger/default'

import type { Page } from 'playwright-core'

import {
  DEFAULT_PROFILE_DIR,
  openNpmBrowserSession,
} from '../fleet/publish-infra/npm/browser-session.mts'

export { DEFAULT_PROFILE_DIR }
import {
  classifyStagedFetch,
  formatChallengeTimeout,
  formatChallengeWait,
  formatUnreadableSettings,
  isSignInRedirect,
  STAGE_PUBLISH_ACTION,
} from './configure-staged-publishing-plan.mts'

import type { StagedConfigurationTarget } from './configure-staged-publishing-plan.mts'

const logger = getDefaultLogger()

// A human-verification challenge is solved by a person, so the budget is
// generous and the poll is slow. This is a pause, not a retry ladder.
export const CHALLENGE_BUDGET_MS = 10 * 60_000
const CHALLENGE_POLL_MS = 5000

// The npm challenge page's per-IP cooldown opt-in. Ticking it lets a batch of
// trust operations ride one approval. Fail-soft — never load-bearing.
const COOLDOWN_OPTIN_SELECTOR = 'input[name="didOptForCooldown"]'

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Run a same-origin fetch in the page's MAIN world. The page's own cookies
 * authenticate it, so no credential is read, copied, or logged by this process.
 * A destroyed execution context from a mid-navigation race yields status 0,
 * which callers treat as retryable rather than fatal.
 */
export async function fetchJsonInPage(
  page: Page,
  url: string,
): Promise<{ body: string; status: number }> {
  try {
    return await page.evaluate(async fetchUrl => {
      // oxlint-disable-next-line socket/no-fetch-prefer-http-request -- runs in the npm page's MAIN world via page.evaluate; the lib httpRequest is unavailable there and only the page's cookies authenticate this request.
      const r = await fetch(fetchUrl, {
        cache: 'no-store',
        credentials: 'same-origin',
        headers: { accept: 'application/json', 'x-spiferack': '1' },
        method: 'GET',
      })
      return { body: await r.text(), status: r.status }
    }, url)
  } catch {
    return { body: '', status: 0 }
  }
}

async function optIntoChallengeCooldown(page: Page): Promise<void> {
  try {
    const box = page.locator(COOLDOWN_OPTIN_SELECTOR).first()
    if ((await box.count()) > 0 && !(await box.isChecked())) {
      await box.check({ timeout: 2000 })
      logger.log(
        'Ticked the npm challenge-cooldown opt-in — trust operations skip re-challenge for 5 minutes.',
      )
    }
  } catch {}
}

/**
 * Read a package's settings payload, pausing for the operator whenever npm
 * answers with a human-verification challenge. The run resumes the moment the
 * challenge clears; nothing is retried blindly, so a challenge never escalates
 * into a rate limit.
 *
 * @throws {Error} When the challenge outlasts its budget, when the session is
 *   signed out, or when npm answers with a non-200 that isn't a challenge.
 */
export async function readSettingsPayload(
  page: Page,
  target: StagedConfigurationTarget,
): Promise<unknown> {
  const started = Date.now()
  let announced = false
  for (;;) {
    // eslint-disable-next-line no-await-in-loop -- serial poll: one live page, one challenge at a time.
    const result = await fetchJsonInPage(page, target.settingsUrl)
    const state = classifyStagedFetch(result)
    if (state === 'ok') {
      try {
        return JSON.parse(result.body)
      } catch (e) {
        throw new Error(
          formatUnreadableSettings(
            target,
            `the settings response was not JSON: ${errorMessage(e)}.`,
          ),
        )
      }
    }
    if (state === 'auth') {
      throw new Error(
        formatUnreadableSettings(
          target,
          `npm answered HTTP ${result.status} — the session is signed out or lacks access to this package.`,
        ),
      )
    }
    if (state === 'error') {
      throw new Error(
        formatUnreadableSettings(target, `npm answered HTTP ${result.status}.`),
      )
    }
    const elapsedMs = Date.now() - started
    if (elapsedMs >= CHALLENGE_BUDGET_MS) {
      throw new Error(
        formatChallengeTimeout({
          budgetMs: CHALLENGE_BUDGET_MS,
          url: target.settingsUrl,
        }),
      )
    }
    if (!announced) {
      logger.warn(
        `Human verification interjected on ${target.name}. This run is PAUSED — solve it in the Chrome window.`,
      )
      // eslint-disable-next-line no-await-in-loop -- one-shot, inside the serial poll.
      await page
        .goto(target.settingsUrl, { waitUntil: 'domcontentloaded' })
        .catch(() => {})
      // eslint-disable-next-line no-await-in-loop -- one-shot, inside the serial poll.
      await page.bringToFront().catch(() => {})
      announced = true
    }
    // eslint-disable-next-line no-await-in-loop -- serial poll while the operator solves the challenge.
    await optIntoChallengeCooldown(page)
    logger.log(
      formatChallengeWait({
        budgetMs: CHALLENGE_BUDGET_MS,
        elapsedMs,
        url: target.settingsUrl,
      }),
    )
    // eslint-disable-next-line no-await-in-loop -- serial poll interval; a human is solving the check.
    await sleep(CHALLENGE_POLL_MS)
  }
}

/**
 * Set the trusted publisher's allowed actions to include a staged publish.
 *
 * Controls are located by their ACCESSIBLE NAME, never a CSS path, and every
 * lookup that misses throws a What / Where / Saw vs wanted / Fix block naming
 * the control inventory it did find. A settings write that cannot prove it hit
 * the right control must fail, never report success.
 *
 * @throws {Error} When the page redirects to sign-in, or when the allowed-actions
 *   control or the save button cannot be located.
 */
export async function applyStagedPublishing(
  page: Page,
  target: StagedConfigurationTarget,
  config: { stageOnly: boolean },
): Promise<void> {
  const { stageOnly } = { __proto__: null, ...config } as typeof config
  await page.goto(target.settingsUrl, { waitUntil: 'domcontentloaded' })
  if (isSignInRedirect(page.url())) {
    throw new Error(
      formatUnreadableSettings(
        target,
        'npm redirected the settings page to sign-in.',
      ),
    )
  }

  const stageControl = page
    .getByRole('checkbox', { name: /stage\s*publish/i })
    .first()
  if ((await stageControl.count()) === 0) {
    // Report only the `name` attributes of the form's controls, never their
    // values, which on a settings page can include tokens. Gathered through
    // Playwright locators rather than a page-world DOM callback, so the
    // diagnostic cannot accidentally serialize page state.
    const controls = await page.getByRole('checkbox').all()
    const found: string[] = []
    for (let i = 0, { length } = controls; i < length; i += 1) {
      // eslint-disable-next-line no-await-in-loop -- serial attribute reads over a short control list.
      const attr = await controls[i]!.getAttribute('name').catch(
        () => undefined,
      )
      found.push(attr ?? '(unnamed)')
    }
    throw new Error(
      [
        `What: the "${STAGE_PUBLISH_ACTION}" control was not found, so ${target.name} was left unchanged.`,
        `Where: ${target.settingsUrl}`,
        `Saw: checkbox controls named [${found.join(', ')}].`,
        `Wanted: an "Allowed actions" checkbox whose accessible name matches "${STAGE_PUBLISH_ACTION}".`,
        'Fix: open the URL above and confirm the package has a trusted publisher configured — the allowed-actions control only renders once one exists. If npm has renamed the control, update the accessible-name matcher in this script.',
      ].join('\n'),
    )
  }
  if (!(await stageControl.isChecked())) {
    await stageControl.check()
  }

  if (stageOnly) {
    // "npm" followed directly by "publish" — the stage control reads
    // "Allow npm stage publish", so it cannot match this.
    const directControl = page
      .getByRole('checkbox', { name: /npm\s+publish/i })
      .first()
    if (
      (await directControl.count()) > 0 &&
      (await directControl.isChecked())
    ) {
      await directControl.uncheck()
    }
  }

  // Scope the save to the form holding the checkbox. The settings page renders
  // a separate "Package access" section with its own save, so a page-wide
  // lookup can submit the wrong form.
  const save = page
    .locator('form')
    .filter({ has: stageControl })
    .getByRole('button', { name: /save changes/i })
    .first()
  if ((await save.count()) === 0) {
    throw new Error(
      [
        `What: the save button was not found, so ${target.name}'s change was not submitted.`,
        `Where: ${target.settingsUrl}`,
        'Saw: no button named "Save changes" inside the form holding the allowed-actions checkboxes.',
        "Wanted: the trusted-publisher form's save button.",
        'Fix: open the URL above and confirm the form renders; if npm has renamed the button, update the accessible-name matcher in this script.',
      ].join('\n'),
    )
  }
  await save.click()
  await page.waitForLoadState('networkidle').catch(() => {})

  // Re-read the saved state rather than trusting the click. A form that
  // rejected validation, or a save the session was no longer authorized for,
  // leaves the page looking unchanged — reporting success from the click alone
  // is how an unconfigured package reads as done.
  await page.reload({ waitUntil: 'domcontentloaded' })
  const persisted = page
    .getByRole('checkbox', { name: /stage\s*publish/i })
    .first()
  if ((await persisted.count()) === 0 || !(await persisted.isChecked())) {
    throw new Error(
      [
        `What: ${target.name} still reports "${STAGE_PUBLISH_ACTION}" as unset after saving.`,
        `Where: ${target.settingsUrl}`,
        'Saw: the control unchecked on a re-read following the save.',
        'Wanted: the control checked, confirming the form persisted.',
        'Fix: open the URL above and save once by hand. A required field left blank — publisher, organization, repository, or workflow filename — blocks the save without changing the checkbox.',
      ].join('\n'),
    )
  }
}

/**
 * A signed-in npm browser session. The caller MUST call `close()`.
 */
export interface NpmSettingsSession {
  close: () => Promise<void>
  page: Page
  user: string
}

/**
 * Launch headed Chrome on the durable profile and wait for a signed-in
 * session, delegating to the fleet's one sanctioned launch in
 * `scripts/fleet/publish-infra/npm/browser-session.mts` so every npm browser
 * tool shares a single launch shape and profile.
 */
export async function openNpmSettingsSession(
  options?: { profileDir?: string | undefined } | undefined,
): Promise<NpmSettingsSession> {
  const { profileDir = DEFAULT_PROFILE_DIR } = {
    __proto__: null,
    ...options,
  } as NonNullable<typeof options>
  const session = await openNpmBrowserSession({ profileDir })
  return { close: session.close, page: session.page, user: session.user }
}
