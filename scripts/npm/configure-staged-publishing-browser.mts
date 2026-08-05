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
 *   A signed-in session is NOT the same as a readable page, which is why every
 *   read goes through {@link waitForAccessPage} first. `/-/whoami` can answer
 *   with the username while npmjs still serves the sign-in / one-time-password
 *   interstitial for the access page, and that interstitial comes back through
 *   the spiferack fetch as HTTP 200 JSON. Reading it as a payload is how a
 *   package the operator was still signing in for got reported `unreadable`.
 *   So the wait polls until the page is authenticated AND settled on the access
 *   URL, and it never navigates while the operator holds the window — a `goto`
 *   mid-wait would wipe a half-typed one-time password.
 *   The WRITE is not hand-rolled here. `create`, `rebind`, and `configure` all
 *   fill the same GitHub Actions trusted-publisher form, so all three delegate
 *   to the fleet's `driveVerifiedSave` — the observed-working driver that opens
 *   the form whatever shape the page renders it in, fills the whole field set
 *   from the desired binding, saves inside the challenge rhythm, and treats the
 *   RE-READ as the arbiter of success rather than the click. A partial write
 *   therefore reports its mismatched fields instead of reading as done.
 */

import { MILLISECONDS_PER_SECOND } from '@socketsecurity/lib-stable/constants/time'
import { errorMessage } from '@socketsecurity/lib-stable/errors/message'
import { getDefaultLogger } from '@socketsecurity/lib-stable/logger/default'
import { sleep } from '@socketsecurity/lib-stable/promises/timers'

import type { Page } from 'playwright-core'

import {
  DEFAULT_PROFILE_DIR,
  openNpmBrowserSession,
  optIntoChallengeCooldown,
  pauseForChallenge,
} from '../fleet/publish-infra/npm/browser-session.mts'

export { DEFAULT_PROFILE_DIR }
import { CHALLENGE_PROGRESS_INTERVAL_MS } from '../fleet/publish-infra/npm/challenge-gate.mts'
import { driveVerifiedSave } from '../fleet/publish-infra/npm/trusted-publisher-page.mts'

import type { TrustedPublisherDesired } from '../fleet/publish-infra/npm/trusted-publisher-plan.mts'
import {
  classifyAccessPageReadiness,
  formatBindingWriteFailure,
  formatOperatorWait,
  formatOperatorWaitTimeout,
  formatUnreadableSettings,
  OPERATOR_POLL_MS,
  TARGET_ENVIRONMENT_NAME,
  TARGET_REPOSITORY_NAME,
  TARGET_REPOSITORY_OWNER,
  TARGET_WORKFLOW_FILENAME,
  WAIT_FOR_OPERATOR_MS,
} from './configure-staged-publishing-plan.mts'

import type {
  StagedConfigurationState,
  StagedConfigurationTarget,
} from './configure-staged-publishing-plan.mts'

const logger = getDefaultLogger()

// How long each poll gives the page to go quiet before its payload is read.
// Bounded and fail-soft: npm keeps background requests running, so a page that
// never reaches network idle must not stall the wait — the landed URL and the
// payload itself are the real gate.
const SETTLE_TIMEOUT_MS = 5 * MILLISECONDS_PER_SECOND

/**
 * One probe of the access page, as read through the browser.
 */
export interface SettingsProbe {
  body: string
  fetchUrl: string
  status: number
}

/**
 * Run a same-origin fetch in the page's MAIN world. The page's own cookies
 * authenticate it, so no credential is read, copied, or logged by this process.
 * The URL the fetch FINALLY landed on is returned alongside the body, because
 * that is the only thing that separates the access page from npm's sign-in
 * interstitial — npm serves the interstitial as HTTP 200 JSON, so status and
 * body shape alone cannot tell them apart. A destroyed execution context from a
 * mid-navigation race yields status 0, which callers treat as retryable rather
 * than fatal.
 */
export async function fetchJsonInPage(
  page: Page,
  url: string,
): Promise<SettingsProbe> {
  try {
    return await page.evaluate(async fetchUrl => {
      // oxlint-disable-next-line socket/no-fetch-prefer-http-request -- runs in the npm page's MAIN world via page.evaluate; the lib httpRequest is unavailable there and only the page's cookies authenticate this request.
      const r = await fetch(fetchUrl, {
        cache: 'no-store',
        credentials: 'same-origin',
        headers: { accept: 'application/json', 'x-spiferack': '1' },
        method: 'GET',
      })
      return { body: await r.text(), fetchUrl: r.url, status: r.status }
    }, url)
  } catch {
    return { body: '', fetchUrl: '', status: 0 }
  }
}

// Give the page a bounded chance to reach network idle. Fail-soft by design:
// a timeout here means "still busy", not "broken", and the caller re-probes.
async function settleAccessPage(page: Page): Promise<void> {
  await page
    .waitForLoadState('networkidle', { timeout: SETTLE_TIMEOUT_MS })
    .catch(() => {})
}

/**
 * Wait until one package's access page is authenticated AND settled, then hand
 * back the probe that proved it.
 *
 * This is the gate every read passes before a single byte of payload is
 * interpreted. `/-/whoami` reporting a username is not enough: npm can answer
 * it while still serving the sign-in / one-time-password interstitial for the
 * access page, and that interstitial arrives as HTTP 200 JSON. Classifying the
 * PAGE — the URL the fetch landed on, the URL the window shows, the sign-in
 * markers — is what keeps a half-finished login from being read as a settings
 * payload and reported `unreadable`.
 *
 * A Cloudflare challenge pauses through the fleet's shared anti-bot rhythm
 * ({@link pauseForChallenge}), which owns the 🖐 gate block, the desktop ping,
 * the cooldown opt-in, and the budget. A sign-in / one-time-password page
 * pauses here instead, and pointedly does NOT navigate: the operator owns that
 * window, and navigating mid-wait would discard a partly entered one-time
 * password. Only the first attempt navigates.
 *
 * @throws {Error} When the wait outlasts {@link WAIT_FOR_OPERATOR_MS}, when the
 *   session is signed out, or when npm answers with a real HTTP error.
 */
export async function waitForAccessPage(
  page: Page,
  target: StagedConfigurationTarget,
  options?: { budgetMs?: number | undefined; pollMs?: number | undefined },
): Promise<SettingsProbe> {
  const opts = { __proto__: null, ...options } as NonNullable<typeof options>
  const budgetMs = opts.budgetMs ?? WAIT_FOR_OPERATOR_MS
  const pollMs = opts.pollMs ?? OPERATOR_POLL_MS
  const started = Date.now()
  let navigated = false
  let announced = false
  let challengeAnnounced = false
  let lastProgressMs = 0
  for (;;) {
    if (!navigated) {
      navigated = true
      // eslint-disable-next-line no-await-in-loop -- one-shot: the only navigation this wait performs.
      await page
        .goto(target.settingsUrl, { waitUntil: 'domcontentloaded' })
        .catch(() => {})
    }
    // eslint-disable-next-line no-await-in-loop -- serial poll: one live page at a time.
    await settleAccessPage(page)
    // eslint-disable-next-line no-await-in-loop -- serial poll: one live page at a time.
    const probe = await fetchJsonInPage(page, target.settingsUrl)
    const readiness = classifyAccessPageReadiness({
      body: probe.body,
      fetchUrl: probe.fetchUrl,
      pageUrl: page.url(),
      status: probe.status,
    })
    if (readiness === 'ready') {
      return probe
    }
    if (readiness === 'auth') {
      throw new Error(
        formatUnreadableSettings(
          target,
          `npm answered HTTP ${probe.status} — the session is signed out or lacks access to this package.`,
        ),
      )
    }
    if (readiness === 'error') {
      throw new Error(
        formatUnreadableSettings(target, `npm answered HTTP ${probe.status}.`),
      )
    }
    const elapsedMs = Date.now() - started
    if (elapsedMs >= budgetMs) {
      throw new Error(
        formatOperatorWaitTimeout({
          budgetMs,
          readiness,
          url: target.settingsUrl,
        }),
      )
    }
    if (readiness === 'challenge') {
      // eslint-disable-next-line no-await-in-loop -- serial pause while the operator solves the challenge.
      await pauseForChallenge(page, {
        announced: challengeAnnounced,
        budgetMs,
        elapsedMs,
        label: target.name,
        pollMs,
        url: target.settingsUrl,
      })
      challengeAnnounced = true
      continue
    }
    // Sign-in, one-time password, or a page that has not landed on the access
    // URL yet. Announce once, then keep the operator posted on the same cadence
    // the challenge gate uses, so a long wait stays visible without becoming a
    // wall of text.
    const line = formatOperatorWait({
      budgetMs,
      elapsedMs,
      readiness,
      url: target.settingsUrl,
    })
    if (!announced) {
      announced = true
      lastProgressMs = elapsedMs
      logger.warn(line)
      // eslint-disable-next-line no-await-in-loop -- one-shot, inside the serial poll.
      await page.bringToFront().catch(() => {})
    } else if (elapsedMs - lastProgressMs >= CHALLENGE_PROGRESS_INTERVAL_MS) {
      lastProgressMs = elapsedMs
      logger.log(line)
    }
    // eslint-disable-next-line no-await-in-loop -- serial poll while the operator finishes signing in.
    await optIntoChallengeCooldown(page)
    // eslint-disable-next-line no-await-in-loop -- serial poll interval; a person is at the keyboard.
    await sleep(pollMs)
  }
}

/**
 * Read a package's settings payload off an authenticated, settled access page.
 * The wait in {@link waitForAccessPage} is what makes the result trustworthy:
 * by the time this parses anything, the window is signed in and sitting on the
 * access URL, so a payload that still carries no trusted-publisher block is a
 * genuine page-shape change rather than an interstitial.
 *
 * @throws {Error} When the operator wait outlasts its budget, when the session
 *   is signed out, when npm answers with a real HTTP error, or when the settled
 *   access page's payload is not JSON.
 */
export async function readSettingsPayload(
  page: Page,
  target: StagedConfigurationTarget,
  options?: { budgetMs?: number | undefined; pollMs?: number | undefined },
): Promise<unknown> {
  const probe = await waitForAccessPage(page, target, options)
  try {
    return JSON.parse(probe.body)
  } catch (e) {
    throw new Error(
      formatUnreadableSettings(
        target,
        `the settings response was not JSON: ${errorMessage(e)}.`,
      ),
    )
  }
}

/**
 * The trusted-publisher binding every `@socketregistry/*` package must end up
 * with, in the fleet driver's own shape. `stageOnly` is the only variable: it
 * clears the direct-publish action so every release has to go through the
 * approval queue.
 */
export function buildDesiredPublisher(config: {
  stageOnly: boolean
}): TrustedPublisherDesired {
  const { stageOnly } = { __proto__: null, ...config } as typeof config
  return {
    allowNpmPublish: !stageOnly,
    allowNpmStagePublish: true,
    environmentName: TARGET_ENVIRONMENT_NAME,
    repositoryName: TARGET_REPOSITORY_NAME,
    repositoryOwner: TARGET_REPOSITORY_OWNER,
    workflowFilename: TARGET_WORKFLOW_FILENAME,
  }
}

/**
 * Write one package's trusted publisher so a staged publish from
 * `npm-publish-packages.yml` is allowed.
 *
 * All three write states drive the SAME form, so all three take the same path:
 * `create` fills it for a package that has no publisher, `rebind` overwrites
 * one pointing at another workflow, and `configure` rewrites a correct binding
 * with the staged action added. Writing the whole field set every time means a
 * half-done earlier pass never survives as a residue.
 *
 * Idempotence is the caller's contract and this function's too: a package the
 * caller already classified as `skip` never reaches here, and a package that IS
 * already correct verifies on the first re-read and reports success without a
 * second write.
 *
 * @throws {Error} When the form cannot be opened, when a human-verification
 *   challenge outlasts its budget, or when the RE-READ does not confirm the
 *   target binding after the save and its one fresh retry.
 */
export async function applyStagedPublishing(
  page: Page,
  target: StagedConfigurationTarget,
  config: { state: StagedConfigurationState; stageOnly: boolean },
): Promise<void> {
  const { state, stageOnly } = { __proto__: null, ...config } as typeof config
  const verdict = await driveVerifiedSave(
    page,
    target.name,
    buildDesiredPublisher({ stageOnly }),
  )
  if (!verdict.ok) {
    throw new Error(
      formatBindingWriteFailure({
        mismatches: verdict.mismatches,
        state,
        target,
      }),
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
