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

import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'

import { errorMessage } from '@socketsecurity/lib-stable/errors/message'
import { getDefaultLogger } from '@socketsecurity/lib-stable/logger/default'
import { chromium } from 'playwright-core'

import type { BrowserContext, Page } from 'playwright-core'

import {
  classifyStagedFetch,
  formatChallengeTimeout,
  formatChallengeWait,
  formatUnreadableSettings,
  isSignInRedirect,
  NPM_ORIGIN,
  STAGE_PUBLISH_ACTION,
} from './configure-staged-publishing-plan.mts'

import type { StagedConfigurationTarget } from './configure-staged-publishing-plan.mts'

const logger = getDefaultLogger()

/**
 * The durable Chrome profile the fleet's staged-packages reader already uses,
 * so an operator signed in for the publish gate is signed in here too. It lives
 * in the OS config dir, never in the repo tree.
 */
export const DEFAULT_PROFILE_DIR = path.join(
  os.homedir(),
  '.config',
  'socket-wheelhouse',
  'staged-browser-profile',
)

// npm OAuth / 2FA is human-paced.
const SIGN_IN_TIMEOUT_MS = 5 * 60_000
const SIGN_IN_POLL_MS = 2000

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
 * The signed-in npm username, or an empty string when the session is signed
 * out.
 */
export async function resolveNpmUser(page: Page): Promise<string> {
  const { body, status } = await fetchJsonInPage(page, `${NPM_ORIGIN}/-/whoami`)
  if (status !== 200) {
    return ''
  }
  try {
    const parsed = JSON.parse(body) as { username?: unknown | undefined }
    return typeof parsed.username === 'string' ? parsed.username : ''
  } catch {
    return ''
  }
}

/**
 * Hand the window to the operator until npm reports a signed-in session. No
 * credential is typed by this process, and the profile persists, so this is a
 * once-per-machine step.
 *
 * @throws {Error} When no session appears within the sign-in budget.
 */
export async function waitForNpmSignIn(
  page: Page,
  profileDir: string,
): Promise<string> {
  await page.goto(NPM_ORIGIN, { waitUntil: 'domcontentloaded' }).catch(() => {})
  const deadline = Date.now() + SIGN_IN_TIMEOUT_MS
  let announced = false
  for (;;) {
    // eslint-disable-next-line no-await-in-loop -- serial poll while the operator signs in.
    await optIntoChallengeCooldown(page)
    // eslint-disable-next-line no-await-in-loop -- serial poll while the operator signs in.
    const user = await resolveNpmUser(page)
    if (user) {
      return user
    }
    if (!announced) {
      logger.log('Sign in to npm in the Chrome window; waiting…')
      announced = true
    }
    if (Date.now() >= deadline) {
      throw new Error(
        [
          'What: the run needs a signed-in npm session and never got one.',
          `Where: the Chrome profile at ${profileDir}`,
          `Saw: /-/whoami reported no user after ${SIGN_IN_TIMEOUT_MS / 1000}s.`,
          'Wanted: a signed-in npmjs.com session in that profile.',
          'Fix: re-run and complete sign-in, including 2FA, in the Chrome window. The profile persists, so this is a one-time step.',
        ].join('\n'),
      )
    }
    // eslint-disable-next-line no-await-in-loop -- serial poll interval.
    await sleep(SIGN_IN_POLL_MS)
  }
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
    const directControl = page
      .getByRole('checkbox', { name: /^\s*npm publish\s*$/i })
      .first()
    if (
      (await directControl.count()) > 0 &&
      (await directControl.isChecked())
    ) {
      await directControl.uncheck()
    }
  }

  const save = page
    .getByRole('button', { name: /update package settings/i })
    .first()
  if ((await save.count()) === 0) {
    throw new Error(
      [
        `What: the save button was not found, so ${target.name}'s change was not submitted.`,
        `Where: ${target.settingsUrl}`,
        'Saw: no button whose accessible name matches "Update Package Settings".',
        "Wanted: the trusted-publisher form's save button.",
        'Fix: open the URL above and confirm the form renders; if npm has renamed the button, update the accessible-name matcher in this script.',
      ].join('\n'),
    )
  }
  await save.click()
  await page.waitForLoadState('networkidle').catch(() => {})
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
 * Launch headed Chrome on the durable profile and wait for a signed-in session.
 * Headed by design: the operator signs in here and solves any human
 * verification here, neither of which a headless run can do.
 */
export async function openNpmSettingsSession(
  options?: { profileDir?: string | undefined } | undefined,
): Promise<NpmSettingsSession> {
  const { profileDir = DEFAULT_PROFILE_DIR } = {
    __proto__: null,
    ...options,
  } as NonNullable<typeof options>
  await fs.mkdir(profileDir, { recursive: true })
  // Overridable for a machine without Chrome installed — playwright-core can't
  // conjure a channel it has no binary for.
  const channel = process.env['SOCKET_BROWSER_CHANNEL'] || 'chrome'
  const context: BrowserContext = await chromium.launchPersistentContext(
    profileDir,
    { channel, headless: false },
  )
  try {
    const page = context.pages()[0] ?? (await context.newPage())
    const user = await waitForNpmSignIn(page, profileDir)
    return { close: () => context.close(), page, user }
  } catch (e) {
    await context.close()
    throw e
  }
}
