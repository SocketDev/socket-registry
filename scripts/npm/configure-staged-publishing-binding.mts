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

import { normalizePayloadKey } from './configure-staged-publishing-payload.mts'

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
 * What the driver should do with one package.
 *
 * - `create` — no trusted publisher exists; fill the whole form.
 * - `rebind` — one exists but points somewhere else; overwrite the whole form.
 * - `configure` — the binding is right and only the staged-publish action is
 *   missing.
 * - `skip` — nothing to do; the idempotent re-run case.
 * - `unreadable` — the settings payload could not be read. Never silently
 *   skipped.
 */
export type StagedConfigurationState =
  | 'configure'
  | 'create'
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
 * What to do with one package, given what npm reports about it today.
 *
 * A `present` block whose binding could not be read reports `rebind` rather
 * than `skip`: rebind rewrites the WHOLE form from the target, so it lands on
 * the right binding whatever the unreadable current values were, while `skip`
 * would leave a package publishing under an identity nobody confirmed.
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
  return reading.actions && permitsStagedPublish(reading.actions)
    ? 'skip'
    : 'configure'
}

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
