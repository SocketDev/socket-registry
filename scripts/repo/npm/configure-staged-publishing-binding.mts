/**
 * @file The trusted-publisher BINDING half of the staged-publishing
 *   configurator — pure, so the target-vs-current comparison and the resulting
 *   state are unit-testable without a browser. A binding is the tuple npm
 *   matches an incoming OIDC claim against: repository owner, repository name,
 *   workflow filename, and GitHub environment. When any part of it disagrees
 *   with the claims a workflow run presents, npm refuses the token exchange
 *   with a 404 and the upload falls through to no credential at all — the
 *   failure that stranded every `@socketregistry/*` package the first time
 *   `.github/workflows/npm-publish-packages.yml` ran.
 *   Reading the binding is deliberately three-valued. `absent` (npm returned a
 *   connections list with no live row) means "create one"; `present` means
 *   "compare and repair"; `unreadable` means the payload was not an access-page
 *   payload at all and MUST stop the run rather than drive a write at a page
 *   nobody has verified.
 */

import {
  DIRECT_PUBLISH_ACTION,
  normalizePayloadKey,
  STAGE_PUBLISH_ACTION,
} from './configure-staged-publishing-payload.mts'

import type {
  TrustedPublisherBinding,
  TrustedPublisherReading,
} from './configure-staged-publishing-payload.mts'

/**
 * The GitHub org every `@socketregistry/*` package publishes from.
 */
export const TARGET_REPOSITORY_OWNER = 'SocketDev'

/**
 * The repository every `@socketregistry/*` package publishes from.
 */
export const TARGET_REPOSITORY_NAME = 'socket-registry'

/**
 * The workflow that stages the `@socketregistry/*` family. This is NOT
 * `npm-publish.yml`: that workflow publishes the single-subject fleet member,
 * while the family stager lives in its own file, and npm matches the workflow
 * FILENAME from the OIDC claim, so the two are not interchangeable.
 */
export const TARGET_WORKFLOW_FILENAME = 'npm-publish-packages.yml'

/**
 * The GitHub environment the staging job runs inside. npm's trusted-publisher
 * config pins it, and an empty environment on the npm side is a mismatch rather
 * than a wildcard.
 */
export const TARGET_ENVIRONMENT_NAME = 'npm-publish'

/**
 * The binding every package in this repo must carry.
 */
export const TARGET_BINDING: Readonly<TrustedPublisherBinding> = Object.freeze({
  environmentName: TARGET_ENVIRONMENT_NAME,
  repositoryName: TARGET_REPOSITORY_NAME,
  repositoryOwner: TARGET_REPOSITORY_OWNER,
  workflowFilename: TARGET_WORKFLOW_FILENAME,
})

/**
 * The allowed actions every `@socketregistry/*` package must end up with, and
 * the ONLY ones.
 *
 * Stage-only is the policy, not an option. Once a package's initial `0.0.0`
 * placeholder exists there is nothing left that needs to publish directly, and
 * leaving the direct grant in place means a compromised or mis-triggered
 * workflow can put a version in front of consumers with no approval step. So
 * "npm publish" is CLEARED, not merely left alone, and a package carrying both
 * grants is a package that still needs work.
 */
export const TARGET_ALLOWED_ACTIONS: readonly string[] = Object.freeze([
  STAGE_PUBLISH_ACTION,
])

/**
 * What the driver should do with one package.
 *
 * - `create` — no trusted publisher exists; fill the whole form.
 * - `rebind` — one exists but points somewhere else; overwrite the whole form.
 * - `configure` — the binding is right and the staged-publish action is missing.
 * - `narrow` — the binding is right and the staged-publish action is there, but
 *   the direct "npm publish" grant is still allowed alongside it. The whole
 *   form is rewritten with that box cleared, so every release has to go through
 *   the approval queue.
 * - `skip` — nothing to do; the idempotent re-run case.
 * - `unreadable` — the settings payload could not be read. Never silently
 *   skipped.
 */
export type StagedConfigurationState =
  | 'configure'
  | 'create'
  | 'narrow'
  | 'rebind'
  | 'skip'
  | 'unreadable'

/**
 * The state a dry run reports. No page has been read, so the plan names its own
 * default action: `create` writes the whole binding, which is correct for a
 * package that has none. The write lane re-reads every package and downgrades
 * to `rebind`, `configure`, or `skip` from what npm actually reports.
 */
export const DRY_RUN_PLAN_STATE: StagedConfigurationState = 'create'

/**
 * The binding fields that disagree with {@link TARGET_BINDING}, named for the
 * operator. Empty means the binding already matches. An `undefined` binding
 * reports every field as unknown, so it never reads as a match.
 */
export function diffTargetBinding(
  binding: TrustedPublisherBinding | undefined,
): string[] {
  const pairs: Array<[string, string | undefined, string]> = [
    ['repository owner', binding?.repositoryOwner, TARGET_REPOSITORY_OWNER],
    ['repository name', binding?.repositoryName, TARGET_REPOSITORY_NAME],
    ['workflow filename', binding?.workflowFilename, TARGET_WORKFLOW_FILENAME],
    ['environment name', binding?.environmentName, TARGET_ENVIRONMENT_NAME],
  ]
  const mismatches: string[] = []
  for (let i = 0, { length } = pairs; i < length; i += 1) {
    const [label, have, want] = pairs[i]!
    if (have !== want) {
      mismatches.push(`${label}: ${have ?? '(unset)'} -> ${want}`)
    }
  }
  return mismatches
}

/**
 * Whether a binding already points at this repo's staging workflow.
 */
export function bindingMatchesTarget(
  binding: TrustedPublisherBinding | undefined,
): boolean {
  return diffTargetBinding(binding).length === 0
}

/**
 * Whether a token set already permits a staged publish. Matches both the
 * human-readable token (`npm stage publish`) and the camel/kebab identifiers
 * npm's own payloads use for it, so a spelling difference between the rendered
 * control and the JSON never reads as "not configured".
 */
export function permitsStagedPublish(actions: ReadonlySet<string>): boolean {
  for (const action of actions) {
    const normalized = normalizePayloadKey(action)
    if (normalized === 'npmstagepublish' || normalized === 'stagepublish') {
      return true
    }
  }
  return false
}

/**
 * Whether a token set still permits a DIRECT, unapproved publish. Matched the
 * same normalized way as the staged twin, and pointedly NOT by asking whether
 * the string contains "publish" — "npm stage publish" contains it too, and a
 * substring test there would report every staged package as still direct.
 */
export function permitsDirectPublish(actions: ReadonlySet<string>): boolean {
  for (const action of actions) {
    const normalized = normalizePayloadKey(action)
    if (
      normalized === 'createpackageversion' ||
      normalized === 'npmpublish' ||
      normalized === 'publish'
    ) {
      return true
    }
  }
  return false
}

/**
 * One-line rendering of an allowed-action set for the plan output. `undefined`
 * is the payload saying nothing, which is materially different from a package
 * with no grants at all.
 */
export function describeAllowedActions(
  actions: ReadonlySet<string> | undefined,
): string {
  if (actions === undefined) {
    return '(unknown)'
  }
  return actions.size ? [...actions].toSorted().join(', ') : '(none)'
}

/**
 * What to do with one package, given what npm reports about it today.
 *
 * A `present` block whose binding could not be read reports `rebind` rather
 * than `skip`: rebind rewrites the WHOLE form from the target, so it lands on
 * the right binding whatever the unreadable current values were, while `skip`
 * would leave a package publishing under an identity nobody confirmed.
 *
 * `skip` is the narrowest verdict in the table on purpose. It requires the
 * target binding, the staged grant present, AND the direct grant gone — a
 * package holding both is `narrow`, never skipped, because leaving the direct
 * grant is what lets a release reach consumers with no approval step.
 */
export function decideStagedConfigurationState(
  reading: TrustedPublisherReading,
): StagedConfigurationState {
  if (reading.blockState === 'unreadable') {
    return 'unreadable'
  }
  if (reading.blockState === 'absent') {
    return 'create'
  }
  if (!bindingMatchesTarget(reading.binding)) {
    return 'rebind'
  }
  const { actions } = reading
  if (!actions || !permitsStagedPublish(actions)) {
    return 'configure'
  }
  return permitsDirectPublish(actions) ? 'narrow' : 'skip'
}

/**
 * Whether a state means the driver writes the form. Every state but `skip` and
 * the fail-loud `unreadable` does.
 */
export function isWriteState(state: StagedConfigurationState): boolean {
  return (
    state === 'configure' ||
    state === 'create' ||
    state === 'narrow' ||
    state === 'rebind'
  )
}

/**
 * The direct-publish action, re-exported so a caller comparing a plan line
 * against the target does not have to reach past the binding module for it.
 */
export { DIRECT_PUBLISH_ACTION, STAGE_PUBLISH_ACTION }

/**
 * One-line rendering of a binding for the plan output.
 */
export function describeBinding(
  binding: TrustedPublisherBinding | undefined,
): string {
  if (!binding) {
    return 'no trusted publisher'
  }
  const owner = binding.repositoryOwner ?? '(unset)'
  const repo = binding.repositoryName ?? '(unset)'
  return (
    `${owner}/${repo}, workflow ${binding.workflowFilename ?? '(unset)'}, ` +
    `environment ${binding.environmentName ?? '(unset)'}`
  )
}
