/**
 * @file Pure planning + payload parsing for the staged-publishing configurator
 *   — no playwright, no network, so the plan, the idempotency decision, and the
 *   challenge/auth classification are unit-testable without a browser. npm has
 *   no registry API for the trusted-publisher configuration: it lives behind
 *   the signed-in web UI at `/package/<name>/access`, whose SPA backend answers
 *   the same path as JSON when asked with `x-spiferack: 1` (the header the
 *   fleet's staged-packages reader already relies on). The JSON key names for
 *   the trusted-publisher block are NOT contractual, so `readAllowedActions`
 *   reads defensively across the plausible spellings and reports `undefined` —
 *   meaning "could not determine" — rather than guessing a value. `undefined`
 *   is never treated as "already configured": an unreadable payload must stop
 *   the run, not silently skip a package.
 */

import {
  classifyStagedFetch,
  isCloudflareChallenge,
  looksLikeHtmlBody,
} from '../fleet/publish-infra/npm/staged-browser-parse.mts'

import type { StagedFetchState } from '../fleet/publish-infra/npm/staged-browser-parse.mts'
import type { StagedTrustReport } from './check-trusted-packages-staged.mts'

export { classifyStagedFetch, isCloudflareChallenge, looksLikeHtmlBody }
export type { StagedFetchState }

export const NPM_ORIGIN = 'https://www.npmjs.com'

/**
 * The action token npm uses for a staged publish in the trusted publisher's
 * "Allowed actions" control.
 */
export const STAGE_PUBLISH_ACTION = 'npm stage publish'

/**
 * The action token for a direct, unapproved publish.
 */
export const DIRECT_PUBLISH_ACTION = 'npm publish'

/**
 * Package settings URL — the page carrying the trusted-publisher block. npm
 * redirects it to `/login?next=<this path>` when the session isn't signed in,
 * which is how the driver detects a signed-out profile without reading a
 * single cookie.
 */
export function buildPackageAccessUrl(packageName: string): string {
  return `${NPM_ORIGIN}/package/${packageName}/access`
}

/**
 * True when a landed URL is npm's sign-in redirect. The driver hands the
 * window to the operator rather than scripting a login, so credentials and 2FA
 * never enter this process.
 */
export function isSignInRedirect(url: string): boolean {
  return /\/login(?:\?|$)/.test(url)
}

/**
 * One package's configuration plan.
 */
export interface StagedConfigurationTarget {
  /**
   * Version dist-tag `latest` points at, carried through from the check so the
   * dry-run output shows what evidence drove the target list.
   */
  latestVersion: string | undefined
  name: string
  settingsUrl: string
}

/**
 * Derive the configuration targets from the staged-publishing check's reports.
 * The list is the check's `not-staged` verdicts and nothing else — never a
 * hardcoded array, so a package that gets configured drops out of the plan on
 * the next run without an edit. `unpublished` entries are excluded: there is
 * no package settings page for a name the registry has never seen.
 */
export function planStagedConfiguration(
  reports: readonly StagedTrustReport[],
): StagedConfigurationTarget[] {
  const targets: StagedConfigurationTarget[] = []
  for (let i = 0, { length } = reports; i < length; i += 1) {
    const report = reports[i]!
    if (report.verdict !== 'not-staged') {
      continue
    }
    targets.push({
      latestVersion: report.latestVersion,
      name: report.name,
      settingsUrl: buildPackageAccessUrl(report.name),
    })
  }
  return targets.toSorted((a, b) => a.name.localeCompare(b.name))
}

function collectStrings(value: unknown, into: Set<string>): void {
  if (typeof value === 'string') {
    into.add(value.trim().toLowerCase())
    return
  }
  if (Array.isArray(value)) {
    for (let i = 0, { length } = value; i < length; i += 1) {
      collectStrings(value[i], into)
    }
    return
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    const keys = Object.keys(record)
    for (let i = 0, { length } = keys; i < length; i += 1) {
      const key = keys[i]!
      // A `{ "npm stage publish": true }` / `{ stagePublish: true }` shape
      // carries the token in the KEY, with the boolean as the value.
      if (record[key] === true) {
        into.add(key.trim().toLowerCase())
      }
      collectStrings(record[key], into)
    }
  }
}

/**
 * The allowed-action tokens on a package's trusted-publisher configuration,
 * lowercased, or `undefined` when the payload carries no recognizable
 * trusted-publisher block.
 *
 * `undefined` means "could not determine", NOT "none configured" — the caller
 * must stop on it. Reading `undefined` as an empty set would make an
 * unparseable payload look like a package needing configuration, and a write
 * driven off a misread payload is exactly the failure this split exists to
 * prevent.
 */
export function readAllowedActions(
  payload: unknown,
): ReadonlySet<string> | undefined {
  if (!payload || typeof payload !== 'object') {
    return undefined
  }
  const found = new Set<string>()
  let sawBlock = false
  const visit = (node: unknown, depth: number): void => {
    if (depth > 6 || !node || typeof node !== 'object') {
      return
    }
    if (Array.isArray(node)) {
      for (let i = 0, { length } = node; i < length; i += 1) {
        visit(node[i], depth + 1)
      }
      return
    }
    const record = node as Record<string, unknown>
    const keys = Object.keys(record)
    for (let i = 0, { length } = keys; i < length; i += 1) {
      const key = keys[i]!
      const normalized = key.toLowerCase().replace(/[^a-z]/g, '')
      if (
        normalized === 'actions' ||
        normalized === 'allowedactions' ||
        normalized === 'permittedactions'
      ) {
        sawBlock = true
        collectStrings(record[key], found)
      }
      visit(record[key], depth + 1)
    }
  }
  visit(payload, 0)
  return sawBlock ? found : undefined
}

/**
 * Whether a token set already permits a staged publish. Matches both the
 * human-readable token (`npm stage publish`) and the camel/kebab identifiers
 * npm's own payloads use for it, so a spelling difference between the rendered
 * control and the JSON never reads as "not configured".
 */
export function permitsStagedPublish(actions: ReadonlySet<string>): boolean {
  for (const action of actions) {
    const normalized = action.toLowerCase().replace(/[^a-z]/g, '')
    if (normalized === 'npmstagepublish' || normalized === 'stagepublish') {
      return true
    }
  }
  return false
}

/**
 * What the driver should do with one package, given its current allowed
 * actions.
 *
 * - `configure` — the trusted publisher exists and does not permit a staged
 *   publish.
 * - `already-configured` — nothing to do; the idempotent re-run case.
 * - `unreadable` — the payload carried no recognizable trusted-publisher block.
 *   Never silently skipped.
 */
export type StagedConfigurationAction =
  | 'already-configured'
  | 'configure'
  | 'unreadable'

export function decideStagedConfigurationAction(
  actions: ReadonlySet<string> | undefined,
): StagedConfigurationAction {
  if (actions === undefined) {
    return 'unreadable'
  }
  return permitsStagedPublish(actions) ? 'already-configured' : 'configure'
}

/**
 * Failure block for a package whose settings payload could not be read, in
 * What / Where / Saw vs wanted / Fix order.
 */
export function formatUnreadableSettings(
  target: StagedConfigurationTarget,
  detail: string,
): string {
  return [
    `What: ${target.name}'s trusted-publisher settings could not be read, so its staged-publishing state is unknown.`,
    `Where: ${target.settingsUrl}`,
    `Saw: ${detail}`,
    'Wanted: a settings payload carrying an "Allowed actions" block.',
    'Fix: open the URL above in the signed-in Chrome window and confirm the package has a trusted publisher configured; a package with no trusted publisher has no allowed-actions control to set.',
  ].join('\n')
}

/**
 * Human-readable progress line for a paused Cloudflare challenge. Kept pure so
 * the wait's observability is testable without a clock or a browser.
 */
export function formatChallengeWait(config: {
  budgetMs: number
  elapsedMs: number
  url: string
}): string {
  const cfg = { __proto__: null, ...config } as typeof config
  const elapsed = Math.round(cfg.elapsedMs / 1000)
  const remaining = Math.max(
    0,
    Math.round((cfg.budgetMs - cfg.elapsedMs) / 1000),
  )
  return `Waiting on human verification at ${cfg.url} — ${elapsed}s elapsed, ${remaining}s before this run gives up. Solve the challenge in the Chrome window; the run resumes on its own.`
}

/**
 * Failure block for a challenge that outlasted its budget.
 */
export function formatChallengeTimeout(config: {
  budgetMs: number
  url: string
}): string {
  const cfg = { __proto__: null, ...config } as typeof config
  return [
    'What: npm kept serving a human-verification challenge, so the run stopped rather than retrying into a rate limit.',
    `Where: ${cfg.url}`,
    `Saw: the challenge was still unsolved after ${Math.round(cfg.budgetMs / 1000)}s of waiting.`,
    'Wanted: the challenge cleared in the Chrome window so the signed-in session can read the page.',
    'Fix: solve the "Just a moment…" check in the Chrome window, then re-run. Nothing was changed, so a re-run is safe.',
  ].join('\n')
}
