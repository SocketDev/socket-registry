/**
 * @file Pure planning for the staged-publishing configurator — no playwright,
 *   no network, so the plan, the per-package state, and the challenge/auth
 *   classification are unit-testable without a browser. npm has no registry API
 *   for the trusted-publisher configuration: it lives behind the signed-in web
 *   UI at `/package/<name>/access`, whose SPA backend answers the same path as
 *   JSON when asked with `x-spiferack: 1` (the header the fleet's
 *   staged-packages reader already relies on).
 *   The plan is the check's `not-staged` verdicts and nothing else, so a
 *   package that gets configured drops out on the next run. A dry run reads no
 *   page at all, so it reports every target under {@link DRY_RUN_PLAN_STATE};
 *   the write lane reads each package's real binding and narrows to `rebind`,
 *   `configure`, or `skip` from there. Binding reading and the state decision
 *   live in `./configure-staged-publishing-binding.mts`, and the access-page
 *   readiness the read lane waits on lives in
 *   `./configure-staged-publishing-session.mts`; both are re-exported here so
 *   callers have one import surface.
 */

import {
  classifyStagedFetch,
  isCloudflareChallenge,
  looksLikeHtmlBody,
} from '../fleet/publish-infra/npm/staged-browser-parse.mts'
import {
  bindingMatchesTarget,
  decideStagedConfigurationState,
  describeBinding,
  diffTargetBinding,
  DRY_RUN_PLAN_STATE,
  permitsStagedPublish,
  readAllowedActions,
  readTrustedPublisherState,
  TARGET_BINDING,
  TARGET_ENVIRONMENT_NAME,
  TARGET_REPOSITORY_NAME,
  TARGET_REPOSITORY_OWNER,
  TARGET_WORKFLOW_FILENAME,
} from './configure-staged-publishing-binding.mts'
import {
  classifyAccessPageReadiness,
  formatOperatorWait,
  formatOperatorWaitTimeout,
  hasAccessPageMarkers,
  hasSignInMarkers,
  isAccessPageUrl,
  isOperatorClearableReadiness,
  isOperatorSignInUrl,
  OPERATOR_POLL_MS,
  WAIT_FOR_OPERATOR_MS,
} from './configure-staged-publishing-session.mts'

import type { StagedFetchState } from '../fleet/publish-infra/npm/staged-browser-parse.mts'
import type { StagedTrustReport } from './check-trusted-packages-staged.mts'
import type {
  StagedConfigurationState,
  TrustedPublisherBinding,
  TrustedPublisherBlockState,
  TrustedPublisherReading,
} from './configure-staged-publishing-binding.mts'
import type {
  AccessPageProbe,
  AccessPageReadiness,
} from './configure-staged-publishing-session.mts'

export {
  bindingMatchesTarget,
  classifyAccessPageReadiness,
  classifyStagedFetch,
  decideStagedConfigurationState,
  describeBinding,
  diffTargetBinding,
  DRY_RUN_PLAN_STATE,
  formatOperatorWait,
  formatOperatorWaitTimeout,
  hasAccessPageMarkers,
  hasSignInMarkers,
  isAccessPageUrl,
  isCloudflareChallenge,
  isOperatorClearableReadiness,
  isOperatorSignInUrl,
  looksLikeHtmlBody,
  OPERATOR_POLL_MS,
  permitsStagedPublish,
  readAllowedActions,
  readTrustedPublisherState,
  TARGET_BINDING,
  TARGET_ENVIRONMENT_NAME,
  TARGET_REPOSITORY_NAME,
  TARGET_REPOSITORY_OWNER,
  TARGET_WORKFLOW_FILENAME,
  WAIT_FOR_OPERATOR_MS,
}
export type {
  AccessPageProbe,
  AccessPageReadiness,
  StagedConfigurationState,
  StagedFetchState,
  TrustedPublisherBinding,
  TrustedPublisherBlockState,
  TrustedPublisherReading,
}

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

/**
 * Render one package's plan entry: its state, the binding npm reports today,
 * the binding it must end up with, and the page an operator would open to check
 * by hand. `binding` is omitted on a dry run, which reads no page.
 */
export function formatStagedPlanLine(config: {
  binding?: TrustedPublisherBinding | undefined
  state: StagedConfigurationState
  target: StagedConfigurationTarget
}): string {
  const cfg = { __proto__: null, ...config } as typeof config
  const { target } = cfg
  const latest = target.latestVersion
    ? ` (npm latest ${target.latestVersion})`
    : ' (unpublished)'
  return [
    `${target.name}${latest}`,
    `  state:   ${cfg.state}`,
    `  current: ${describeBinding(cfg.binding)}`,
    `  target:  ${describeBinding(TARGET_BINDING)}`,
    `  page:    ${target.settingsUrl}`,
  ].join('\n')
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
    'Wanted: a settings payload carrying the trusted-publisher connections list, or an "Allowed actions" block.',
    'Fix: open the URL above in the signed-in Chrome window and confirm the access page renders. A package with NO trusted publisher is not this error — that reads as `create` and the run configures it. Nor is a half-finished sign-in: the run waits for the window to settle on the access page before reading anything, so a login or one-time-password interstitial can never land here. This block means the payload WAS the settled access page and the key names have changed; re-derive them before writing.',
  ].join('\n')
}

/**
 * Failure block for a trusted-publisher write that did not verify, in What /
 * Where / Saw vs wanted / Fix order. `mismatches` names the fields npm still
 * reports off-target after the save, so the operator knows exactly what to
 * correct by hand.
 */
export function formatBindingWriteFailure(config: {
  mismatches: readonly string[]
  state: StagedConfigurationState
  target: StagedConfigurationTarget
}): string {
  const cfg = { __proto__: null, ...config } as typeof config
  const saw = cfg.mismatches.length
    ? cfg.mismatches.join('; ')
    : 'the re-read did not report the saved binding at all'
  return [
    `What: ${cfg.target.name}'s trusted publisher did not reach the target binding, so its staged publish will still be refused.`,
    `Where: ${cfg.target.settingsUrl}`,
    `Saw: after the ${cfg.state} save, ${saw}.`,
    `Wanted: ${describeBinding(TARGET_BINDING)}, with "${STAGE_PUBLISH_ACTION}" allowed.`,
    'Fix: open the URL above and set those fields by hand. The row may be PARTIALLY saved, so check every field, not just the ones named above.',
  ].join('\n')
}
