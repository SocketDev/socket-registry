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
 *   The WRITE is not hand-rolled here. `create`, `rebind`, and `configure` all
 *   fill the same GitHub Actions trusted-publisher form, so all three delegate
 *   to the fleet's `driveVerifiedSave` — the observed-working driver that opens
 *   the form whatever shape the page renders it in, fills the whole field set
 *   from the desired binding, saves inside the challenge rhythm, and treats the
 *   RE-READ as the arbiter of success rather than the click. A partial write
 *   therefore reports its mismatched fields instead of reading as done.
 */

import { errorMessage } from '@socketsecurity/lib-stable/errors/message'
import { getDefaultLogger } from '@socketsecurity/lib-stable/logger/default'

import type { Page } from 'playwright-core'

import {
  DEFAULT_PROFILE_DIR,
  openNpmBrowserSession,
} from '../fleet/publish-infra/npm/browser-session.mts'

export { DEFAULT_PROFILE_DIR }
import { driveVerifiedSave } from '../fleet/publish-infra/npm/trusted-publisher-page.mts'

import type { TrustedPublisherDesired } from '../fleet/publish-infra/npm/trusted-publisher-plan.mts'
import {
  classifyStagedFetch,
  formatBindingWriteFailure,
  formatChallengeTimeout,
  formatChallengeWait,
  formatUnreadableSettings,
  TARGET_ENVIRONMENT_NAME,
  TARGET_REPOSITORY_NAME,
  TARGET_REPOSITORY_OWNER,
  TARGET_WORKFLOW_FILENAME,
} from './configure-staged-publishing-plan.mts'

import type {
  StagedConfigurationState,
  StagedConfigurationTarget,
} from './configure-staged-publishing-plan.mts'

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
