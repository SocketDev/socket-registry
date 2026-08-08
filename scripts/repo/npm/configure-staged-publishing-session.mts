/**
 * @file Pure session readiness for the staged-publishing configurator — no
 *   playwright, no network, so every state the run pauses on is unit-testable
 *   without a browser.
 *   This exists because a signed-in session is not the same thing as a
 *   READABLE access page. `/-/whoami` answered `socket-bot` while npmjs was
 *   still serving the sign-in / one-time-password interstitial for
 *   `/package/<name>/access`, and that interstitial comes back through the
 *   spiferack fetch as HTTP 200 JSON — valid JSON, no Cloudflare markup, no
 *   HTML. The binding reader then found neither a connections list nor an
 *   "Allowed actions" block in it and reported the package `unreadable`
 *   (observed 2026-08-05 on `@socketregistry/abab`), which is a hard failure
 *   for a page the operator had simply not finished signing into yet.
 *   The fix is to classify the page the payload came FROM, not just the
 *   payload: the final URL after redirects, the visible window URL, and the
 *   sign-in markers all get a say, and `ready` is the only state that permits
 *   a payload read. Everything else either pauses for the operator
 *   (`challenge`, `sign-in`, `two-factor`, `unsettled`) or fails loud (`auth`,
 *   `error`).
 *   `two-factor` is the second half of the same lesson, and it hid behind the
 *   first. Once the sign-in wait was working, `@socketregistry/abab` STILL read
 *   as `unreadable` on what looked like a settled access page, and the payload
 *   carried neither `oidcConnections` nor an allowed-actions block — which read
 *   as "npm changed the payload shape". Dumping the payload's key tree
 *   (`--dump-payload`, 2026-08-05) showed it was never the access page at all:
 *   npm answers the access URL with its two-factor STEP-UP payload
 *   (`escalateType`, `hasTotp`, `disable2faPasswordOption`,
 *   `publicKeyCredentialRequestOptions`, `originalUrl` pointing back at the
 *   access path) as HTTP 200 JSON, at the access URL, for a session that is
 *   fully signed in. Every signed-out heuristic misses it precisely because the
 *   session is NOT signed out: `user.name` is populated, no login form renders,
 *   and the landed URL is the access page. So the escalation gets its own
 *   marker set and its own operator pause, and the connections keys were never
 *   the problem.
 *   The third lesson reordered everything above it. A settled access page
 *   renders npm's dismissable notice banners — the 2026 warning about tokens
 *   that bypass two-factor, an error banner when provenance details fail to
 *   load — and the challenge detector scored that copy as human-verification
 *   text. The run then announced "waiting on human verification" and burned its
 *   whole ten-minute budget while the trusted-publisher form sat open
 *   underneath. So the PAYLOAD now decides first: a body carrying the settings
 *   data or the rendered form is `ready`, whatever banners render around it,
 *   and only a body with no payload at all is handed to the challenge,
 *   step-up, and sign-in matchers. A real interstitial has no package data to
 *   serve, so nothing is weakened by asking about the payload first.
 */

import {
  MILLISECONDS_PER_MINUTE,
  MILLISECONDS_PER_SECOND,
} from '@socketsecurity/lib-stable/constants/time'

import { classifyStagedFetch } from '../../fleet/registry-infra/npm/staged-browser-parse.mts'
import {
  hasHumanVerificationMarkers,
  hasSettingsPayloadMarkers,
} from './configure-staged-publishing-markers.mts'

/**
 * The ONE budget for every state a person has to clear in the browser window:
 * a Cloudflare challenge, a sign-in, a one-time password. Sized for an
 * unhurried human — finding the authenticator app, mistyping the code once,
 * and trying again — not for a machine. The run polls inside this budget and
 * writes nothing until the access page itself renders.
 */
export const WAIT_FOR_OPERATOR_MS = 10 * MILLISECONDS_PER_MINUTE

/**
 * How often the wait re-probes the page. Slow on purpose: the probe is a
 * same-origin fetch, and hammering npm while a bot challenge is outstanding
 * earns a rate limit.
 */
export const OPERATOR_POLL_MS = 5 * MILLISECONDS_PER_SECOND

/**
 * What a probe of the package access page found.
 *
 * - `ready` — an authenticated, settled access page. The ONLY state whose payload
 *   may be read, and therefore the only state from which a package can be
 *   reported `unreadable`.
 * - `sign-in` — npm's own login / verification / one-time-password interstitial.
 *   The operator clears it in the window; the run waits.
 * - `challenge` — a Cloudflare human-verification interstitial. Same pause,
 *   driven through the fleet's shared anti-bot rhythm.
 * - `two-factor` — npm's two-factor STEP-UP for an already signed-in session: the
 *   account is authenticated, but this page needs a fresh authenticator code
 *   before npm will serve it. Distinct from `sign-in` because the operator
 *   instruction is different — there is nothing to log into, only a code to
 *   enter — and because reading its payload as settings data is what made a
 *   package report `unreadable`.
 * - `unsettled` — a 200 that did not end on the access page, or a destroyed
 *   execution context from a mid-navigation race. Not yet an answer.
 * - `auth` — npm refused the session outright (401/403 with no sign-in page).
 * - `error` — a real HTTP failure.
 */
export type AccessPageReadiness =
  | 'auth'
  | 'challenge'
  | 'error'
  | 'ready'
  | 'sign-in'
  | 'two-factor'
  | 'unsettled'

/**
 * One probe of the access page: the body, the status, the URL the fetch
 * finally landed on after redirects, and the URL the visible window is
 * showing. The two URLs are read separately because they disagree exactly
 * when this matters — the window can sit on the one-time-password page while
 * a background fetch answers 200.
 */
export interface AccessPageProbe {
  body?: string | undefined
  fetchUrl?: string | undefined
  pageUrl?: string | undefined
  status: number
}

// The package access page, the only URL a payload may be read from.
const ACCESS_PAGE_URL_PATTERN = /\/package\/[^?#]+\/access(?:[?#]|$)/i

// URLs npm parks a half-authenticated session on. `otp` and `challenge` are
// matched as whole words rather than substrings, and never against the access
// page itself, so a package whose NAME carries one of those words cannot read
// as an interstitial.
const SIGN_IN_URL_PATTERNS: readonly RegExp[] = [
  /\/login(?:[/?#]|$)/i,
  /\/logout(?:[/?#]|$)/i,
  /\/verify(?:[/?#]|$)/i,
  /\/sign-?(?:in|up)(?:[/?#]|$)/i,
  /\/two-factor(?:[/?#]|$)/i,
  /\botp\b/i,
  /\bchallenge\b/i,
]

// Controls only a login / one-time-password form renders. Deliberately narrow:
// the access page carries a "Require two-factor authentication" publishing
// option, so any two-factor WORDING would match the very page being waited for.
const SIGN_IN_FORM_MARKERS: readonly RegExp[] = [
  /<form[^>]*action="[^"]*\/login/i,
  /name="password"/i,
  /name="otp(?:[cC]ode)?"/i,
  /id="npm-otp"/i,
]

// Keys ONLY npm's two-factor STEP-UP payload carries. Anchored on KEY NAMES,
// never on markup or copy: the step-up arrives as JSON from the `x-spiferack`
// fetch, so there is no markup to anchor on, and npm's own key names are the
// stabler contract anyway.
//
// Quotes may be escaped (\") when the JSON sits embedded inside an HTML page's
// string, which is how the same payload arrives through the server-rendered
// route. These two name the escalation itself, so they are decisive on their
// own.
const TWO_FACTOR_ESCALATION_MARKERS: readonly RegExp[] = [
  /\\?"escalateType\\?"\s*:/,
  /\\?"disable2faPasswordOption\\?"\s*:/,
]

// The step-up's WebAuthn arm. These describe an ACCOUNT's second-factor
// posture, not the escalation, so they can legitimately ride a settings payload
// — npm is tightening two-factor across the site, and a page that starts
// reporting the account's WebAuthn devices would otherwise read as a step-up
// forever. They count only when no settings payload accompanies them, the same
// two-tier split the fleet parser uses for Cloudflare's ambient scripts.
const TWO_FACTOR_WEBAUTHN_MARKERS: readonly RegExp[] = [
  /\\?"publicKeyCredentialRequestOptions\\?"\s*:/,
  /\\?"hasWebAuthnDevices\\?"\s*:/,
]

// Content only a signed-in access page carries. Its presence settles a marker
// that would otherwise read as a sign-in page.
const ACCESS_PAGE_MARKERS: readonly RegExp[] = [
  /\\?"oidcConnections\\?"/,
  /Trusted [Pp]ublish(?:er|ing)/,
  /publishingAccess/,
  /Publishing access/i,
]

function matchesAny(value: string, patterns: readonly RegExp[]): boolean {
  for (let i = 0, { length } = patterns; i < length; i += 1) {
    if (patterns[i]!.test(value)) {
      return true
    }
  }
  return false
}

/**
 * Whether a URL is a package access page.
 */
export function isAccessPageUrl(url: string | undefined): boolean {
  return !!url && ACCESS_PAGE_URL_PATTERN.test(url)
}

/**
 * Whether a landed URL is one only a PERSON can move off: npm's sign-in
 * redirect, its verification / one-time-password step, or a challenge page.
 * The driver hands the window to the operator rather than scripting a login,
 * so no credential or one-time password ever enters this process.
 *
 * The access page is never a sign-in URL, whatever its package name spells.
 */
export function isOperatorSignInUrl(url: string | undefined): boolean {
  if (!url || isAccessPageUrl(url)) {
    return false
  }
  return matchesAny(url, SIGN_IN_URL_PATTERNS)
}

/**
 * Whether a signed-in access page's own content is present in `body` — either
 * its settings payload / rendered form, or the page's own copy.
 */
export function hasAccessPageMarkers(body: string): boolean {
  return (
    !!body &&
    (hasSettingsPayloadMarkers(body) || matchesAny(body, ACCESS_PAGE_MARKERS))
  )
}

// The escalation's own keys, which veto `ready` on their own. Split out from
// the two-tier export below so the readiness gate can ask the narrow question
// without the WebAuthn arm's ambiguity.
function hasDecisiveTwoFactorMarkers(body: string): boolean {
  return !!body && matchesAny(body, TWO_FACTOR_ESCALATION_MARKERS)
}

/**
 * Whether `body` is npm's two-factor STEP-UP payload rather than the page that
 * was asked for.
 *
 * This is the misread that cost a diagnosis. npm serves the step-up AT the
 * requested URL, as HTTP 200 JSON, to a session that is fully signed in — so
 * the landed URL says "access page", the status says "fine", and the envelope's
 * `user` is populated, which is exactly what every signed-out heuristic looks
 * for the absence of. Only the step-up's own keys tell them apart, and reading
 * it as settings data reports a configured package as having no
 * trusted-publisher block at all.
 *
 * Two tiers. The escalation's own keys decide on their own; its WebAuthn arm
 * counts only when the body carries no settings payload, because an account's
 * second-factor posture can legitimately ride the page that was asked for.
 */
export function hasTwoFactorEscalationMarkers(body: string): boolean {
  if (!body) {
    return false
  }
  if (hasDecisiveTwoFactorMarkers(body)) {
    return true
  }
  return (
    matchesAny(body, TWO_FACTOR_WEBAUTHN_MARKERS) &&
    !hasSettingsPayloadMarkers(body)
  )
}

/**
 * Whether `body` is npm's sign-in / one-time-password page rather than the
 * access page. `"user": null` is the spiferack envelope's signed-out marker,
 * and `Sign in to npm` is the login page's own copy; both are ignored when the
 * body also carries access-page content, since a settled page settles them.
 */
export function hasSignInMarkers(body: string): boolean {
  if (!body || hasAccessPageMarkers(body)) {
    return false
  }
  return (
    matchesAny(body, SIGN_IN_FORM_MARKERS) ||
    /\\?"user\\?"\s*:\s*null/.test(body) ||
    /sign in to npm/i.test(body)
  )
}

/**
 * Classify one probe of the access page.
 *
 * Order matters, and it was learned twice.
 *
 * A sign-in URL still wins over everything: npm answers the interstitial with
 * HTTP 200 JSON, so status and body shape alone read it as a perfectly good
 * response — the misread that reported a package `unreadable` while the
 * operator was still typing a one-time password. A destroyed execution context
 * (status 0) is a mid-navigation race, so it is unsettled rather than an error.
 *
 * Then the PAYLOAD decides. A 200 that landed on the access page and carries
 * the settings data — or the trusted-publisher form itself — is `ready`, before
 * any text matcher gets a say. That ordering is the fix for a live run that
 * announced "waiting on human verification" against npm's own dismissable
 * notice banners and waited out its full budget with the form open underneath.
 * It weakens nothing: a Cloudflare interstitial and a two-factor step-up carry
 * no package data, which is exactly why asking about the data first is safe.
 * The step-up's own keys still veto `ready`, since npm serves it AT the access
 * URL as a 200 and its payload must never be read as settings.
 */
export function classifyAccessPageReadiness(
  probe: AccessPageProbe,
): AccessPageReadiness {
  const cfg = { __proto__: null, ...probe } as AccessPageProbe
  const body = cfg.body ?? ''
  if (isOperatorSignInUrl(cfg.fetchUrl) || isOperatorSignInUrl(cfg.pageUrl)) {
    return 'sign-in'
  }
  if (cfg.status === 0) {
    return 'unsettled'
  }
  if (
    cfg.status === 200 &&
    hasSettingsPayloadMarkers(body) &&
    !hasDecisiveTwoFactorMarkers(body) &&
    isAccessPageUrl(cfg.fetchUrl ?? cfg.pageUrl)
  ) {
    return 'ready'
  }
  if (hasHumanVerificationMarkers(body)) {
    return 'challenge'
  }
  // Before every other body check, and before the `ready` return at the bottom.
  // The step-up is served AT the access URL, as a 200, to a signed-in session,
  // so nothing else here can catch it — and if it reaches the payload reader it
  // reports a configured package as having no trusted-publisher block.
  if (hasTwoFactorEscalationMarkers(body)) {
    return 'two-factor'
  }
  // Before the HTML check below: npm can server-render its login page AT the
  // access URL, and a bare "HTML where JSON was expected" reading would file
  // that under Cloudflare rather than under the sign-in the operator has to
  // finish.
  if (hasSignInMarkers(body)) {
    return 'sign-in'
  }
  const fetched = classifyStagedFetch({ body, status: cfg.status })
  if (fetched === 'challenge') {
    return 'challenge'
  }
  if (fetched === 'auth') {
    return 'auth'
  }
  if (fetched === 'error') {
    return 'error'
  }
  return isAccessPageUrl(cfg.fetchUrl ?? cfg.pageUrl) ? 'ready' : 'unsettled'
}

/**
 * Whether a readiness state is one the OPERATOR clears in the browser window,
 * as opposed to one the run fails on.
 */
export function isOperatorClearableReadiness(
  readiness: AccessPageReadiness,
): boolean {
  return (
    readiness === 'challenge' ||
    readiness === 'sign-in' ||
    readiness === 'two-factor' ||
    readiness === 'unsettled'
  )
}

// What the operator is being waited on for, per state.
function describeWaitReason(readiness: AccessPageReadiness): string {
  if (readiness === 'sign-in') {
    return 'npm is serving its sign-in / one-time-password page instead of the access page'
  }
  if (readiness === 'two-factor') {
    return 'the session is signed in, but npm wants a fresh two-factor code before it will serve this page'
  }
  if (readiness === 'challenge') {
    return 'npm is serving a human-verification challenge'
  }
  return 'npm has not settled on the access page yet'
}

/**
 * The one line the run prints while it waits for the operator. Kept pure so
 * the wait's observability is testable without a clock or a browser.
 */
export function formatOperatorWait(config: {
  budgetMs: number
  elapsedMs: number
  readiness: AccessPageReadiness
  url: string
}): string {
  const cfg = { __proto__: null, ...config } as typeof config
  const elapsed = Math.round(cfg.elapsedMs / MILLISECONDS_PER_SECOND)
  const remaining = Math.max(
    0,
    Math.round((cfg.budgetMs - cfg.elapsedMs) / MILLISECONDS_PER_SECOND),
  )
  return (
    `Waiting for you at ${cfg.url} — ${describeWaitReason(cfg.readiness)}. ` +
    `${elapsed}s elapsed, ${remaining}s before this run gives up. ` +
    'Finish sign-in, including the one-time password, in the open Chrome window; ' +
    'the run resumes on its own and nothing is written until it does.'
  )
}

/**
 * Failure block for an operator wait that outlasted its budget, in What /
 * Where / Saw vs wanted / Fix order.
 */
export function formatOperatorWaitTimeout(config: {
  budgetMs: number
  readiness: AccessPageReadiness
  url: string
}): string {
  const cfg = { __proto__: null, ...config } as typeof config
  const seconds = Math.round(cfg.budgetMs / MILLISECONDS_PER_SECOND)
  return [
    'What: the access page never became readable, so the run stopped rather than reading a page nobody had signed into.',
    `Where: ${cfg.url}`,
    `Saw: after ${seconds}s of waiting, ${describeWaitReason(cfg.readiness)}.`,
    'Wanted: the signed-in access page, settled on that URL, carrying the trusted-publisher block.',
    'Fix: finish sign-in and any one-time password in the Chrome window, then re-run. Nothing was written, so a re-run is safe.',
  ].join('\n')
}
