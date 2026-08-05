/**
 * @file The PAYLOAD-READING half of the staged-publishing configurator — pure,
 *   so every key path npm's access page is read through is unit-testable from
 *   invented fixtures, with no browser and no network.
 *   Reading is deliberately three-valued. `absent` (npm returned a connections
 *   list with no live row) means "create one"; `present` means "compare and
 *   repair"; `unreadable` means the payload was not an access-page payload at
 *   all and MUST stop the run rather than drive a write at a page nobody has
 *   verified.
 *   Every key name is read defensively across its plausible spellings, because
 *   npm's trusted-publisher JSON is not a documented contract. The observed
 *   spelling is always tried FIRST and the rest are fallbacks, so a rename
 *   degrades to reading the other name rather than to "no publisher
 *   configured" — which a caller would act on by writing a second publisher
 *   over a live row.
 *   The two-factor step-up is recognized here for one reason: npm serves it AT
 *   the access URL, as HTTP 200 JSON, to a session that is fully signed in, so
 *   it reaches a reader looking exactly like a settings response that lost its
 *   trusted-publisher block. Naming it is what turns "npm changed the payload
 *   shape" back into "enter your authenticator code".
 */

import { OIDC_PERMISSION_ACTIONS } from '../fleet/publish-infra/npm/access-context-schema.mts'

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

// npm's own keys for the trusted-publisher connections list, normalized so a
// snake/camel/kebab spelling difference in the payload never reads as absent.
// `oidcConnections` is the key npm serves today and the first one tried; the
// rest are accepted as fallbacks so a rename alone cannot turn a configured
// package into a planned `create`.
const OIDC_CONNECTIONS_KEYS: readonly string[] = [
  'oidcconnections',
  'trustedpublishers',
  'trustedpublisherconnections',
  'oidcpublishers',
]

// The keys npm's two-factor STEP-UP payload carries. Recognized here for ONE
// reason: so a step-up that reaches the reader is reported as the step-up it is
// rather than as "npm renamed the connections key". It never changes the
// verdict — a step-up payload stays `unreadable`, because it says nothing at
// all about the package's trusted publisher.
const TWO_FACTOR_ESCALATION_KEYS: readonly string[] = [
  'escalatetype',
  'disablefapasswordoption',
  'publickeycredentialrequestoptions',
  'haswebauthndevices',
]

const MAX_PAYLOAD_DEPTH = 6

/**
 * A payload key reduced to its letters, lowercased, so a snake / camel / kebab
 * spelling difference never reads as a different key.
 */
export function normalizePayloadKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z]/g, '')
}

/**
 * Whether `payload` is npm's two-factor step-up rather than a settings payload.
 *
 * Npm serves the step-up AT the access URL, as HTTP 200 JSON, to a session that
 * is fully signed in — so it reaches a reader looking exactly like a settings
 * response that lost its trusted-publisher block. Telling the two apart is what
 * turns "npm changed the payload shape" back into "enter your authenticator
 * code", which is the whole difference between a re-derivation and a re-run.
 */
export function isTwoFactorEscalationPayload(payload: unknown): boolean {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return false
  }
  const keys = Object.keys(payload as Record<string, unknown>)
  for (let i = 0, { length } = keys; i < length; i += 1) {
    if (TWO_FACTOR_ESCALATION_KEYS.includes(normalizePayloadKey(keys[i]!))) {
      return true
    }
  }
  return false
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
      if (
        Array.isArray(value) &&
        OIDC_CONNECTIONS_KEYS.includes(normalizePayloadKey(key))
      ) {
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
      const normalized = normalizePayloadKey(key)
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

// The first non-empty string among `keys`, in the order given. npm's observed
// spelling goes first and the camelCase twin second, so a rename of the inner
// config keys degrades to reading the other spelling rather than to an
// all-`(unset)` binding — which `diffTargetBinding` would report as a total
// mismatch and a caller would then rebind over a correct row.
function readConfigValue(
  config: Record<string, unknown>,
  keys: readonly string[],
): string | undefined {
  for (let i = 0, { length } = keys; i < length; i += 1) {
    const value = nonEmptyString(config[keys[i]!])
    if (value !== undefined) {
      return value
    }
  }
  return undefined
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
      environmentName: readConfigValue(config, [
        'environment_name',
        'environmentName',
      ]),
      repositoryName: readConfigValue(config, [
        'repository_name',
        'repositoryName',
      ]),
      repositoryOwner: readConfigValue(config, [
        'repository_owner',
        'repositoryOwner',
      ]),
      workflowFilename: readConfigValue(config, [
        'workflow',
        'workflow_filename',
        'workflowFilename',
      ]),
    },
    blockState: 'present',
  }
}

/**
 * How many permission tokens the live connection carries, or undefined when
 * there is no live connection to count.
 *
 * The COUNT is the diagnostic, not the tokens. Comparing it against how many
 * actions {@link readTrustedPublisherState} managed to map is what surfaces a
 * grant npm has added that the action map does not know — which otherwise
 * disappears silently, and would make `--stage-only` clear an action it never
 * recognized.
 */
export function countConnectionPermissionTokens(
  payload: unknown,
): number | undefined {
  const connections = findOidcConnections(payload)
  if (connections === undefined) {
    return undefined
  }
  for (let i = 0, { length } = connections; i < length; i += 1) {
    const row = connections[i]
    if (isLiveConnection(row)) {
      return Array.isArray(row.permissions) ? row.permissions.length : 0
    }
  }
  return undefined
}
