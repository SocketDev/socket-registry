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
 *   `configure`, `narrow`, or `skip` from there. Binding reading and the state
 *   decision live in `./configure-staged-publishing-binding.mts`, the page
 *   markers in `./configure-staged-publishing-markers.mts`, the operator
 *   overlay in `./configure-staged-publishing-overlay.mts`, and the access-page
 *   readiness the read lane waits on in
 *   `./configure-staged-publishing-session.mts`; all four are re-exported here
 *   so callers have one import surface.
 */

import {
  classifyStagedFetch,
  isCloudflareChallenge,
  looksLikeHtmlBody,
} from '../../fleet/registry-infra/npm/staged-browser-parse.mts'
import {
  bindingMatchesTarget,
  decideStagedConfigurationState,
  describeAllowedActions,
  describeBinding,
  diffTargetBinding,
  DRY_RUN_PLAN_STATE,
  isWriteState,
  permitsDirectPublish,
  permitsStagedPublish,
  TARGET_ALLOWED_ACTIONS,
  TARGET_BINDING,
  TARGET_ENVIRONMENT_NAME,
  TARGET_REPOSITORY_NAME,
  TARGET_REPOSITORY_OWNER,
  TARGET_WORKFLOW_FILENAME,
} from './configure-staged-publishing-binding.mts'
import {
  hasHumanVerificationMarkers,
  hasSettingsPayloadMarkers,
  normalizeChallengeText,
  stripDismissableBanners,
} from './configure-staged-publishing-markers.mts'
import {
  buildOperatorOverlayCss,
  buildOperatorOverlayHtml,
  buildOperatorOverlayInjectionScript,
  buildOperatorOverlayRemovalScript,
  OPERATOR_OVERLAY_CAPTION,
  OPERATOR_OVERLAY_ELEMENT_ID,
  shouldShowOperatorOverlay,
} from './configure-staged-publishing-overlay.mts'
import {
  countConnectionPermissionTokens,
  DIRECT_PUBLISH_ACTION,
  findUnmappedPermissionTokens,
  grantTokensForAction,
  isTwoFactorEscalationPayload,
  readAllowedActions,
  readConnectionPermissionTokens,
  readTrustedPublisherState,
  resolvePermissionAction,
  STAGE_PUBLISH_ACTION,
} from './configure-staged-publishing-payload.mts'
import {
  classifyAccessPageReadiness,
  formatOperatorWait,
  formatOperatorWaitTimeout,
  hasAccessPageMarkers,
  hasSignInMarkers,
  hasTwoFactorEscalationMarkers,
  isAccessPageUrl,
  isOperatorClearableReadiness,
  isOperatorSignInUrl,
  OPERATOR_POLL_MS,
  WAIT_FOR_OPERATOR_MS,
} from './configure-staged-publishing-session.mts'

import type { StagedFetchState } from '../../fleet/registry-infra/npm/staged-browser-parse.mts'
import type { StagedTrustReport } from './check-trusted-packages-staged.mts'
import type { StagedConfigurationState } from './configure-staged-publishing-binding.mts'
import type {
  TrustedPublisherBinding,
  TrustedPublisherBlockState,
  TrustedPublisherReading,
} from './configure-staged-publishing-payload.mts'
import type {
  AccessPageProbe,
  AccessPageReadiness,
} from './configure-staged-publishing-session.mts'

export {
  bindingMatchesTarget,
  buildOperatorOverlayCss,
  buildOperatorOverlayHtml,
  buildOperatorOverlayInjectionScript,
  buildOperatorOverlayRemovalScript,
  classifyAccessPageReadiness,
  classifyStagedFetch,
  countConnectionPermissionTokens,
  decideStagedConfigurationState,
  describeAllowedActions,
  describeBinding,
  diffTargetBinding,
  DIRECT_PUBLISH_ACTION,
  DRY_RUN_PLAN_STATE,
  findUnmappedPermissionTokens,
  formatOperatorWait,
  formatOperatorWaitTimeout,
  grantTokensForAction,
  hasAccessPageMarkers,
  hasHumanVerificationMarkers,
  hasSettingsPayloadMarkers,
  hasSignInMarkers,
  hasTwoFactorEscalationMarkers,
  isAccessPageUrl,
  isCloudflareChallenge,
  isOperatorClearableReadiness,
  isOperatorSignInUrl,
  isTwoFactorEscalationPayload,
  isWriteState,
  looksLikeHtmlBody,
  normalizeChallengeText,
  OPERATOR_OVERLAY_CAPTION,
  OPERATOR_OVERLAY_ELEMENT_ID,
  OPERATOR_POLL_MS,
  permitsDirectPublish,
  permitsStagedPublish,
  readAllowedActions,
  readConnectionPermissionTokens,
  readTrustedPublisherState,
  resolvePermissionAction,
  shouldShowOperatorOverlay,
  STAGE_PUBLISH_ACTION,
  stripDismissableBanners,
  TARGET_ALLOWED_ACTIONS,
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
  /**
   * How many versions the registry reported for this name. Carried through
   * because clearing the direct-publish grant is gated on it: the run only
   * narrows a package the registry actually answered for, so a packument read
   * that came back empty can never drive a permission being taken away.
   */
  publishedVersionCount: number
  settingsUrl: string
}

/**
 * Whether `target` has the registry evidence the run requires before it clears
 * a package's direct-publish grant.
 *
 * At least one published version — the `0.0.0` name-reservation placeholder
 * counts, and every package in this plan has one, since the plan is built from
 * `not-staged` verdicts and those are only reachable for a name the registry
 * answered for. The check is here anyway because the cost of getting it wrong
 * is one-sided: taking a grant away from a package whose packument never
 * loaded is a permission removed on no evidence at all.
 */
export function hasPackumentEvidence(
  target: StagedConfigurationTarget,
): boolean {
  return target.publishedVersionCount > 0
}

/**
 * Failure block for a narrow the run refused to perform, in What / Where / Saw
 * vs wanted / Fix order.
 */
export function formatMissingPackumentEvidence(
  target: StagedConfigurationTarget,
): string {
  return [
    `What: ${target.name}'s direct-publish grant was left alone, because nothing proved the package exists on the registry.`,
    `Where: ${target.settingsUrl}`,
    'Saw: the registry reported no published versions for this name, not even a 0.0.0 placeholder.',
    'Wanted: at least one published version, so a permission is only ever taken away from a package the registry answered for.',
    'Fix: confirm the name resolves (`npm view <package>`), then re-run. If the read failed for a network reason the re-run clears it; if the package really is unpublished it has nothing to narrow.',
  ].join('\n')
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
      publishedVersionCount: report.publishedVersionCount,
      settingsUrl: buildPackageAccessUrl(report.name),
    })
  }
  return targets.toSorted((a, b) => a.name.localeCompare(b.name))
}

/**
 * Render one package's plan entry: its state, the binding and permissions npm
 * reports today, the binding and permissions it must end up with, and the page
 * an operator would open to check by hand. `binding` and `actions` are omitted
 * on a dry run, which reads no page.
 *
 * The permission pair is printed on every line, not only for `narrow`. A
 * package whose ONLY defect is the extra direct-publish grant otherwise looks
 * identical to a correct one — same binding, same workflow, same environment —
 * and the two grant lines side by side are the only thing that shows the
 * difference at a glance.
 */
export function formatStagedPlanLine(config: {
  actions?: ReadonlySet<string> | undefined
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
    `  grants:  ${describeAllowedActions(cfg.actions)}`,
    `  wanted:  ${TARGET_ALLOWED_ACTIONS.join(', ')}`,
    `  page:    ${target.settingsUrl}`,
  ].join('\n')
}

/**
 * What an unreadable payload actually was, phrased for the `Saw:` line.
 *
 * The two causes need opposite responses, and telling them apart is the whole
 * point: a two-factor step-up is cleared by entering a code and re-running,
 * while a genuinely unrecognized payload means npm's key names moved and the
 * reader has to be re-derived (`--dump-payload`) before anything is written.
 * Reporting the first as the second is how "npm changed the payload shape"
 * became the working theory for a page that only wanted an authenticator code.
 */
export function describeUnreadableCause(payload: unknown): string {
  if (isTwoFactorEscalationPayload(payload)) {
    return 'npm answered with its two-factor step-up payload instead of the access page. The session IS signed in; npm wants a fresh authenticator code before it will serve this page.'
  }
  return 'on an authenticated access page that had settled on that URL, the settings payload carried neither a trusted-publisher connections list nor an "Allowed actions" block.'
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
    'Fix: open the URL above in the signed-in Chrome window and confirm the access page renders. A package with NO trusted publisher is not this error — that reads as `create` and the run configures it. Nor is a half-finished sign-in or a two-factor step-up: the run waits out both before reading anything. If the Saw line names the step-up, enter the authenticator code in the Chrome window and re-run. Otherwise the payload WAS the settled access page and the key names have changed — re-derive them with `--dump-payload <package>` before writing.',
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
    `Wanted: ${describeBinding(TARGET_BINDING)}, with "${STAGE_PUBLISH_ACTION}" allowed and "${DIRECT_PUBLISH_ACTION}" cleared.`,
    'Fix: open the URL above and set those fields by hand. The row may be PARTIALLY saved, so check every field, not just the ones named above.',
  ].join('\n')
}
