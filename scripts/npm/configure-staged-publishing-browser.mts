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
 *   NOTHING here navigates after that first `goto`, and that is the module's
 *   load-bearing invariant rather than a nicety. The fleet's shared
 *   `pauseForChallenge` reloads the page on every fresh pause, and the fleet's
 *   `driveVerifiedSave` re-navigates on every attempt; together they produced a
 *   loop on a live run where the reload closed the trusted-publisher form it
 *   had just opened, and the rapid reload traffic PROVOKED the very Cloudflare
 *   challenges it was pausing for. So the pause here is
 *   {@link pauseForOperatorInPlace} — the fleet's operator UX, its gate block,
 *   its desktop ping and its budget, with the `goto` removed — and the write
 *   goes through `./configure-staged-publishing-write.mts`, which opens the
 *   form once and treats an in-place RE-READ as the arbiter of success rather
 *   than the click.
 *   During a REAL challenge or two-factor step-up the Socket shield is injected
 *   into the page as an operator-attention cue. It is best-effort garnish:
 *   `pointer-events: none` so it can never swallow the verify click, wrapped in
 *   try/catch so a page that refuses evaluation cannot break the wait, and
 *   removed the moment readiness clears.
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
} from '../fleet/publish-infra/npm/browser-session.mts'

export { DEFAULT_PROFILE_DIR }
import {
  CHALLENGE_PROGRESS_INTERVAL_MS,
  tickChallengeGate,
} from '../fleet/publish-infra/npm/challenge-gate.mts'

import type { TrustedPublisherDesired } from '../fleet/publish-infra/npm/trusted-publisher-plan.mts'
import {
  buildOperatorOverlayHtml,
  classifyAccessPageReadiness,
  formatBindingWriteFailure,
  formatMissingPackumentEvidence,
  formatOperatorWait,
  formatOperatorWaitTimeout,
  formatUnreadableSettings,
  hasPackumentEvidence,
  OPERATOR_OVERLAY_ELEMENT_ID,
  OPERATOR_POLL_MS,
  shouldShowOperatorOverlay,
  TARGET_ENVIRONMENT_NAME,
  TARGET_REPOSITORY_NAME,
  TARGET_REPOSITORY_OWNER,
  TARGET_WORKFLOW_FILENAME,
  WAIT_FOR_OPERATOR_MS,
} from './configure-staged-publishing-plan.mts'
import { saveTrustedPublisherInPlace } from './configure-staged-publishing-write.mts'

import type { AccessPageReadiness } from './configure-staged-publishing-session.mts'
import type {
  StagedConfigurationState,
  StagedConfigurationTarget,
} from './configure-staged-publishing-plan.mts'

const logger = getDefaultLogger()

/**
 * The operator wait a caller can substitute. One tick: announce if this is a
 * fresh pause, keep the cooldown opt-in ticked, sleep. Injected rather than
 * imported at the call site so the wait loop's no-navigation invariant is
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
 * Idempotent: the element is looked up first, so a poll loop calling this every
 * tick injects once and then does nothing. Entirely best-effort — every failure
 * is swallowed, because a page that refuses evaluation is a page the run should
 * keep waiting on, not one it should abandon over a missing decoration.
 */
export async function showOperatorOverlay(page: Page): Promise<void> {
  try {
    await page.evaluate(
      ([elementId, html]) => {
        if (document.getElementById(elementId!)) {
          return
        }
        const host = document.createElement('div')
        host.innerHTML = html!
        const node = host.firstElementChild
        if (node) {
          document.body.append(node)
        }
      },
      [OPERATOR_OVERLAY_ELEMENT_ID, buildOperatorOverlayHtml()] as const,
    )
  } catch {}
}

/**
 * Take the shield back down. Called whenever readiness is not a state a person
 * clears, so a navigation that dropped the overlay and a challenge that cleared
 * both end the same way.
 */
export async function removeOperatorOverlay(page: Page): Promise<void> {
  try {
    await page.evaluate(elementId => {
      document.getElementById(elementId)?.remove()
    }, OPERATOR_OVERLAY_ELEMENT_ID)
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
 * One tick of the operator pause, WITHOUT the fleet pause's reload.
 *
 * The fleet's `pauseForChallenge` is otherwise exactly what is wanted here — it
 * owns the 🖐 gate block, the desktop ping, the cross-call pause tracker, the
 * progress cadence and the budget — but on a fresh pause it re-navigates to the
 * URL. That reload closed the trusted-publisher form mid-write on a live run,
 * and the resulting reload loop is itself the traffic shape npm's bot
 * management answers with a challenge. So this composes the same
 * {@link tickChallengeGate} the fleet pause is built on and simply does not
 * navigate: the window is brought forward instead, which gets the operator's
 * attention without touching the page's state.
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
    await cfg.page.bringToFront().catch(() => {})
  }
  await optIntoChallengeCooldown(cfg.page)
  await sleep(cfg.pollMs)
}

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
