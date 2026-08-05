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
import { CHALLENGE_PROGRESS_INTERVAL_MS } from '../fleet/publish-infra/npm/challenge-gate.mts'

import type { TrustedPublisherDesired } from '../fleet/publish-infra/npm/trusted-publisher-plan.mts'
import {
  classifyAccessPageReadiness,
  formatBindingWriteFailure,
  formatMissingPackumentEvidence,
  formatOperatorWait,
  formatOperatorWaitTimeout,
  formatUnreadableSettings,
  hasPackumentEvidence,
  OPERATOR_POLL_MS,
  TARGET_ENVIRONMENT_NAME,
  TARGET_REPOSITORY_NAME,
  TARGET_REPOSITORY_OWNER,
  TARGET_WORKFLOW_FILENAME,
  WAIT_FOR_OPERATOR_MS,
} from './configure-staged-publishing-plan.mts'
import {
  pauseForOperatorInPlace,
  removeOperatorOverlay,
  syncOperatorOverlay,
} from './configure-staged-publishing-operator.mts'
import { saveTrustedPublisherInPlace } from './configure-staged-publishing-write.mts'

import type { OperatorPause } from './configure-staged-publishing-operator.mts'
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
 * The wait navigates AT MOST ONCE, on its first tick, and never again — not on
 * a challenge, not on a step-up, not on a sign-in. The operator owns that
 * window: a `goto` mid-wait discards a partly entered one-time password, closes
 * a form the write lane has open, and adds one more reload to the traffic
 * pattern that earns a challenge in the first place. `navigate: false` skips
 * even that first one, for a caller whose page is already there.
 *
 * A real challenge or step-up pauses through {@link pauseForOperatorInPlace},
 * which keeps the fleet's operator UX — the 🖐 gate block, the desktop ping,
 * the cooldown opt-in, the budget — and drops its reload. The Socket shield
 * goes up for those two states and comes down for everything else.
 *
 * @throws {Error} When the wait outlasts {@link WAIT_FOR_OPERATOR_MS}, when the
 *   session is signed out, or when npm answers with a real HTTP error.
 */
export async function waitForAccessPage(
  page: Page,
  target: StagedConfigurationTarget,
  options?: {
    budgetMs?: number | undefined
    navigate?: boolean | undefined
    pause?: OperatorPause | undefined
    pollMs?: number | undefined
  },
): Promise<SettingsProbe> {
  const opts = { __proto__: null, ...options } as NonNullable<typeof options>
  const budgetMs = opts.budgetMs ?? WAIT_FOR_OPERATOR_MS
  const pollMs = opts.pollMs ?? OPERATOR_POLL_MS
  const pause =
    opts.pause ??
    (async config => {
      await pauseForOperatorInPlace({ ...config, page })
    })
  const started = Date.now()
  let navigated = opts.navigate === false
  let announced = false
  let lastProgressMs = 0
  for (;;) {
    if (!navigated) {
      navigated = true
      // eslint-disable-next-line no-await-in-loop -- one-shot: the ONLY navigation this wait ever performs.
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
    // eslint-disable-next-line no-await-in-loop -- serial: the overlay tracks each reading in turn.
    await syncOperatorOverlay(page, readiness)
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
    if (readiness === 'challenge' || readiness === 'two-factor') {
      // eslint-disable-next-line no-await-in-loop -- serial pause while the operator clears the challenge, in place.
      await pause({
        budgetMs,
        elapsedMs,
        label: target.name,
        pollMs,
        url: target.settingsUrl,
      })
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
  options?: {
    budgetMs?: number | undefined
    navigate?: boolean | undefined
    pause?: OperatorPause | undefined
    pollMs?: number | undefined
  },
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
 * with, in the fleet driver's own shape.
 *
 * Stage-only is the target, not an option. `clearDirectPublish` exists solely
 * so the ONE case with no registry evidence behind it — a name the packument
 * read never answered for — can still be bound to the right workflow without
 * having a permission taken away on the strength of nothing.
 */
export function buildDesiredPublisher(config: {
  clearDirectPublish: boolean
}): TrustedPublisherDesired {
  const { clearDirectPublish } = {
    __proto__: null,
    ...config,
  } as typeof config
  return {
    allowNpmPublish: !clearDirectPublish,
    allowNpmStagePublish: true,
    environmentName: TARGET_ENVIRONMENT_NAME,
    repositoryName: TARGET_REPOSITORY_NAME,
    repositoryOwner: TARGET_REPOSITORY_OWNER,
    workflowFilename: TARGET_WORKFLOW_FILENAME,
  }
}

/**
 * Write one package's trusted publisher so a staged publish from
 * `npm-publish-packages.yml` is allowed, and a direct publish is not.
 *
 * Every write state drives the SAME form, so every one takes the same path:
 * `create` fills it for a package that has no publisher, `rebind` overwrites
 * one pointing at another workflow, `configure` adds the staged action to a
 * correct binding, and `narrow` clears the direct-publish grant that was left
 * beside it. Writing the whole field set every time means a half-done earlier
 * pass never survives as a residue.
 *
 * The caller must have left the page ON the settled access page — this drives
 * the form where it stands and never navigates, because a reload is what closed
 * the form mid-write on the run this replaced.
 *
 * Idempotence is the caller's contract and this function's too: a package the
 * caller already classified as `skip` never reaches here, and a package that IS
 * already correct verifies on the first re-read and reports success without a
 * second write.
 *
 * @throws {Error} When the package carries no registry evidence, when the form
 *   cannot be opened, when a human-verification challenge outlasts its budget,
 *   or when the in-place RE-READ does not confirm the target after the save.
 */
export async function applyStagedPublishing(
  page: Page,
  target: StagedConfigurationTarget,
  config: {
    state: StagedConfigurationState
    verifyPollMs?: number | undefined
    verifyTimeoutMs?: number | undefined
  },
): Promise<void> {
  const cfg = { __proto__: null, ...config } as typeof config
  // Assert the packument was readable BEFORE anything is cleared. Every package
  // in the plan clears this today — the plan is built from `not-staged`
  // verdicts, which only exist for a name the registry answered for — and it is
  // checked anyway, because a permission taken away on an empty read is not
  // recoverable by re-running.
  if (!hasPackumentEvidence(target)) {
    throw new Error(formatMissingPackumentEvidence(target))
  }
  const desired = buildDesiredPublisher({ clearDirectPublish: true })
  const budgetMs = WAIT_FOR_OPERATOR_MS
  const started = Date.now()
  const verdict = await saveTrustedPublisherInPlace(page, {
    challengePresent: async () => {
      const probe = await fetchJsonInPage(page, target.settingsUrl)
      const readiness = classifyAccessPageReadiness({
        body: probe.body,
        fetchUrl: probe.fetchUrl,
        pageUrl: page.url(),
        status: probe.status,
      })
      return readiness === 'challenge' || readiness === 'two-factor'
    },
    desired,
    label: target.name,
    pause: async () => {
      await pauseForOperatorInPlace({
        budgetMs,
        elapsedMs: Date.now() - started,
        label: target.name,
        page,
        pollMs: OPERATOR_POLL_MS,
        url: target.settingsUrl,
      })
    },
    readPayload: async () => {
      const probe = await fetchJsonInPage(page, target.settingsUrl)
      return JSON.parse(probe.body)
    },
    verifyPollMs: cfg.verifyPollMs,
    verifyTimeoutMs: cfg.verifyTimeoutMs,
  })
  await removeOperatorOverlay(page)
  if (!verdict.ok) {
    throw new Error(
      formatBindingWriteFailure({
        mismatches: verdict.mismatches,
        state: cfg.state,
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
