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

import { OIDC_PERMISSION_ACTIONS } from '../fleet/publish-infra/npm/access-context-schema.mts'

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
 * The tuple npm matches a workflow run's OIDC claim against.
 */
export interface TrustedPublisherBinding {
  environmentName: string | undefined
  repositoryName: string | undefined
  repositoryOwner: string | undefined
  workflowFilename: string | undefined
}

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
 * Whether npm's settings payload carried a trusted-publisher block.
 *
 * - `present` — a live connection exists; its binding and actions are readable.
 * - `absent` — the payload carried a connections list with no live row. This is a
 *   genuinely unconfigured package, the `create` case.
 * - `unreadable` — the payload was not recognizable as an access-page payload.
 *   Never treated as `absent`: a write driven off a misread payload is the
 *   failure this split exists to prevent.
 */
export type TrustedPublisherBlockState = 'absent' | 'present' | 'unreadable'

/**
 * One package's current trusted-publisher configuration, as read off npm's
 * settings payload. `binding` is `undefined` when the block exists but the
 * payload did not spell out what it points at — an allowed-actions block with
 * no connections list, for instance.
 */
export interface TrustedPublisherReading {
  actions: ReadonlySet<string> | undefined
  binding: TrustedPublisherBinding | undefined
  blockState: TrustedPublisherBlockState
}

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

// npm's own key for the trusted-publisher connections list, normalized so a
// snake/camel/kebab spelling difference in the payload never reads as absent.
const OIDC_CONNECTIONS_KEY = 'oidcconnections'

const MAX_PAYLOAD_DEPTH = 6

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z]/g, '')
}

// The trusted-publisher connections list wherever it sits in the payload, or
// undefined when the payload carries no such key. An empty array is a real
// answer — "no publisher configured" — and is returned as an empty array, never
// as undefined.
function findOidcConnections(payload: unknown): unknown[] | undefined {
  let found: unknown[] | undefined
  const visit = (node: unknown, depth: number): void => {
    if (
      found !== undefined ||
      depth > MAX_PAYLOAD_DEPTH ||
      !node ||
      typeof node !== 'object'
    ) {
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
      const value = record[key]
      if (normalizeKey(key) === OIDC_CONNECTIONS_KEY && Array.isArray(value)) {
        found = value
        return
      }
      visit(value, depth + 1)
    }
  }
  visit(payload, 0)
  return found
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
 * allowed-actions block.
 *
 * `undefined` means "could not determine", NOT "none configured" — the caller
 * must stop on it. Reading `undefined` as an empty set would make an
 * unparseable payload look like a package needing configuration, and a write
 * driven off a misread payload is exactly the failure this split prevents. The
 * key names are read defensively across the plausible spellings because npm's
 * trusted-publisher JSON is not a documented contract.
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
    if (depth > MAX_PAYLOAD_DEPTH || !node || typeof node !== 'object') {
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
      const normalized = normalizeKey(key)
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

// A connection row npm still honors: it carries a config object and has not
// been revoked. A revoked row is history, not configuration.
function isLiveConnection(
  row: unknown,
): row is { config: Record<string, unknown>; permissions?: unknown } {
  if (!row || typeof row !== 'object') {
    return false
  }
  const record = row as { config?: unknown; deleted?: unknown }
  if (!record.config || typeof record.config !== 'object') {
    return false
  }
  // Any falsy `deleted` is live, matching the fleet's own connections parser in
  // `trusted-publisher-parse.mts`. Two readers disagreeing on which rows count
  // is how one of them plans a create over a publisher the other can see.
  return !record.deleted
}

function nonEmptyString(value: unknown): string | undefined {
  return typeof value === 'string' && value !== '' ? value : undefined
}

/**
 * Read one package's trusted-publisher binding and allowed actions off npm's
 * settings payload.
 *
 * The connections list is the page's own DATA, so it reports the live
 * configuration exactly, where scraping rendered markers can miss a restyled
 * summary and report an existing publisher as absent — which would plan a
 * create over a row that already exists.
 */
export function readTrustedPublisherState(
  payload: unknown,
): TrustedPublisherReading {
  if (!payload || typeof payload !== 'object') {
    return { actions: undefined, binding: undefined, blockState: 'unreadable' }
  }
  const connections = findOidcConnections(payload)
  if (connections === undefined) {
    // No connections list. An allowed-actions block still proves a publisher
    // exists, but not what it points at, so the binding stays unknown.
    const actions = readAllowedActions(payload)
    return actions === undefined
      ? { actions: undefined, binding: undefined, blockState: 'unreadable' }
      : { actions, binding: undefined, blockState: 'present' }
  }
  let live:
    | { config: Record<string, unknown>; permissions?: unknown }
    | undefined
  for (let i = 0, { length } = connections; i < length; i += 1) {
    const row = connections[i]
    if (isLiveConnection(row)) {
      live = row
      break
    }
  }
  if (!live) {
    return { actions: undefined, binding: undefined, blockState: 'absent' }
  }
  const { config } = live
  const actions = new Set<string>()
  const permissions = Array.isArray(live.permissions) ? live.permissions : []
  for (let i = 0, { length } = permissions; i < length; i += 1) {
    const token = permissions[i]
    const action =
      typeof token === 'string' ? OIDC_PERMISSION_ACTIONS[token] : undefined
    if (action) {
      actions.add(action)
    }
  }
  return {
    actions,
    binding: {
      environmentName: nonEmptyString(config['environment_name']),
      repositoryName: nonEmptyString(config['repository_name']),
      repositoryOwner: nonEmptyString(config['repository_owner']),
      workflowFilename: nonEmptyString(config['workflow']),
    },
    blockState: 'present',
  }
}

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
    const normalized = normalizeKey(action)
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
