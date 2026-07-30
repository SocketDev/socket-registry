/**
 * @file Staged-publishing leg of the trusted-package gate. npm's staged
 *   publishing routes a publish through an approval queue before the version
 *   goes live; the registry records that on the published version as
 *   `_npmUser.approver`, which socket-lib's packument slimmer surfaces as
 *   `PackumentVersionMetaSlim.staged`. There is no package-level "staged is
 *   enabled" field in the packument — the only registry-observable evidence is
 *   whether published versions carry the marker — so this module gates on the
 *   version that dist-tag `latest` points at and reports the per-version
 *   history alongside it, since a package staged today but not for its older
 *   releases is a materially different state from one never staged at all.
 *   The roster is derived from `registry/manifest.json` (the set of packages
 *   this repo publishes) rather than a hardcoded list, and a manifest version
 *   that isn't on the registry yet is a pending bump, not a failure. A
 *   registry read that fails for any reason other than a 404 propagates — a
 *   trust gate that reads green because a fetch died is worse than no gate.
 *   Pure classification lives in `classifyStagedTrust` so the verdict table is
 *   unit-testable without a network; `readStagedTrust` is the thin I/O wrapper
 *   around socket-lib's `getPackumentSlim`.
 */

import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { errorMessage } from '@socketsecurity/lib-stable/errors/message'
import { getPackumentSlim } from '@socketsecurity/lib/npm/meta'

import { REPO_ROOT } from '../fleet/paths.mts'

import type {
  GetPackumentSlimOptions,
  PackumentMetaSlim,
} from '@socketsecurity/lib/npm/meta-types'

/**
 * The published-package roster of record. Constructed once here; every consumer
 * imports it rather than rebuilding the path from its own `__dirname`.
 */
export const REGISTRY_MANIFEST_PATH = path.join(
  REPO_ROOT,
  'registry',
  'manifest.json',
)

/**
 * Verdict for one package's staged-publishing state.
 *
 * - `staged` — the version dist-tag `latest` points at carries the approver
 *   marker, so that publish went through the approval queue.
 * - `not-staged` — `latest` is published but carries no marker.
 * - `unpublished` — the registry has no versions for this name (a 404, or a
 *   packument with an empty version map). Not a failure: the roster
 *   legitimately contains packages whose first publish hasn't happened.
 */
export type StagedVerdict = 'not-staged' | 'staged' | 'unpublished'

/**
 * One package's staged-publishing state, as read from its full packument.
 */
export interface StagedTrustReport {
  /**
   * Version dist-tag `latest` resolves to, or `undefined` when unpublished or
   * when the packument carries no `latest` tag.
   */
  latestVersion: string | undefined
  /**
   * Version `registry/manifest.json` declares for this package, when the
   * caller supplied one.
   */
  manifestVersion: string | undefined
  /**
   * Whether `manifestVersion` exists on the registry. `false` means a bump is
   * in flight — the verdict is still read off `latestVersion`, so an unlanded
   * bump never reads as a staged-publishing regression.
   */
  manifestVersionIsPublished: boolean
  name: string
  /**
   * Total versions on the registry.
   */
  publishedVersionCount: number
  /**
   * Versions carrying the approver marker. Equal to `publishedVersionCount`
   * when staged publishing has been on since the first release; lower when it
   * was turned on partway through the package's history.
   */
  stagedVersionCount: number
  verdict: StagedVerdict
}

/**
 * A roster entry: the package this repo publishes plus the version of record
 * from `registry/manifest.json`.
 */
export interface StagedRosterEntry {
  manifestVersion: string | undefined
  name: string
}

/**
 * Shape of one `registry/manifest.json` `npm` row — a purl paired with its
 * metadata record. Only the fields this module reads are modelled.
 */
export type StagedManifestRow = [
  purl: string,
  data: { name?: string | undefined; version?: string | undefined } | undefined,
]

/**
 * Derive the staged-publishing roster from a parsed `registry/manifest.json`.
 * The manifest is the authoritative list of what this repo publishes, so the
 * predicate for "must be staged-enabled" is membership in it — never a
 * hardcoded array that drifts the moment a package is added or dropped. Rows
 * without a usable name are skipped rather than guessed at.
 */
export function collectStagedRoster(manifest: unknown): StagedRosterEntry[] {
  const rows =
    manifest &&
    typeof manifest === 'object' &&
    Array.isArray((manifest as { npm?: unknown }).npm)
      ? ((manifest as { npm: unknown[] }).npm as StagedManifestRow[])
      : []
  const seen = new Map<string, StagedRosterEntry>()
  for (let i = 0, { length } = rows; i < length; i += 1) {
    const row = rows[i]
    const data = Array.isArray(row) ? row[1] : undefined
    const name = typeof data?.name === 'string' ? data.name : ''
    if (!name) {
      continue
    }
    const version = typeof data?.version === 'string' ? data.version : undefined
    seen.set(name, { manifestVersion: version, name })
  }
  return Array.from(seen.values()).toSorted((a, b) =>
    a.name.localeCompare(b.name),
  )
}

/**
 * Read `registry/manifest.json` and derive the roster, optionally narrowed to
 * the scopes this repo publishes.
 *
 * An unreadable manifest THROWS. Swallowing it would silently shrink the roster
 * to nothing and let the gate report success over an empty set — the exact
 * false-green this module exists to avoid.
 *
 * @throws {Error} When the manifest cannot be read or parsed.
 */
export async function loadStagedRoster(options?: {
  scopes?: readonly string[] | undefined
}): Promise<StagedRosterEntry[]> {
  const { scopes } = { __proto__: null, ...options } as NonNullable<
    typeof options
  >
  let manifest: unknown
  try {
    manifest = JSON.parse(await readFile(REGISTRY_MANIFEST_PATH, 'utf8'))
  } catch (e) {
    throw new Error(
      [
        'What: the package roster could not be read, so the staged-publishing gate has nothing to check.',
        `Where: ${REGISTRY_MANIFEST_PATH}`,
        `Saw: ${errorMessage(e)}`,
        'Wanted: a readable manifest with an `npm` array of [purl, data] rows.',
        'Fix: regenerate it with `node scripts/npm/update-manifest.mts`, or restore the file from git.',
      ].join('\n'),
    )
  }
  const roster = collectStagedRoster(manifest)
  if (!scopes?.length) {
    return roster
  }
  return roster.filter(entry => scopes.some(s => entry.name.startsWith(s)))
}

/**
 * Classify one package's staged-publishing state from its slimmed full
 * packument. Pure — the network lives in `readStagedTrust`. Passing
 * `undefined` for `meta` means the registry answered 404.
 */
export function classifyStagedTrust(
  name: string,
  options?:
    | {
        manifestVersion?: string | undefined
        meta?: PackumentMetaSlim | undefined
      }
    | undefined,
): StagedTrustReport {
  const { manifestVersion, meta } = {
    __proto__: null,
    ...options,
  } as NonNullable<typeof options>
  const versionMap = meta?.versions ?? {}
  const versions = Object.keys(versionMap)
  let stagedVersionCount = 0
  for (let i = 0, { length } = versions; i < length; i += 1) {
    if (versionMap[versions[i]!]?.staged === true) {
      stagedVersionCount += 1
    }
  }
  const manifestVersionIsPublished =
    manifestVersion !== undefined &&
    Object.hasOwn(versionMap, manifestVersion) === true

  if (!versions.length) {
    return {
      latestVersion: undefined,
      manifestVersion,
      manifestVersionIsPublished: false,
      name,
      publishedVersionCount: 0,
      stagedVersionCount: 0,
      verdict: 'unpublished',
    }
  }

  // Gate on dist-tag `latest` — the version consumers actually install, and
  // the freshest evidence of the setting's current state. Fall back to the
  // sole published version when the packument carries no `latest` tag (a
  // package whose only releases sit behind another tag).
  const taggedLatest = meta?.distTags?.['latest']
  const latestVersion =
    taggedLatest !== undefined && Object.hasOwn(versionMap, taggedLatest)
      ? taggedLatest
      : versions.length === 1
        ? versions[0]
        : undefined

  if (latestVersion === undefined) {
    return {
      latestVersion: undefined,
      manifestVersion,
      manifestVersionIsPublished,
      name,
      publishedVersionCount: versions.length,
      stagedVersionCount,
      verdict: 'not-staged',
    }
  }

  return {
    latestVersion,
    manifestVersion,
    manifestVersionIsPublished,
    name,
    publishedVersionCount: versions.length,
    stagedVersionCount,
    verdict:
      versionMap[latestVersion]?.staged === true ? 'staged' : 'not-staged',
  }
}

/**
 * Read one package's staged-publishing state from the registry.
 *
 * `variant: 'full'` is mandatory: the abbreviated packument omits `_npmUser`,
 * so `staged` would read `undefined` for every version and the gate would
 * report a false `not-staged` across the board.
 *
 * A 404 resolves to an `unpublished` verdict. Every other failure — a network
 * error, a 5xx, a malformed body — propagates, so a run can never report a
 * package trustworthy because its fetch died.
 *
 * @throws {Error} When the registry read fails with anything other than a 404.
 */
/**
 * The HTTP status carried by a packument-fetch error, or undefined. Local
 * because @socketsecurity/lib 6.5.1 compiles its `extractHttpStatus` export
 * out of the published build.
 */
export function httpStatusOf(e: unknown): number | undefined {
  if (!e || typeof e !== 'object') {
    return undefined
  }
  const err = e as { status?: unknown; statusCode?: unknown }
  if (typeof err.status === 'number') {
    return err.status
  }
  if (typeof err.statusCode === 'number') {
    return err.statusCode
  }
  return undefined
}

export async function readStagedTrust(
  entry: StagedRosterEntry,
  options?: GetPackumentSlimOptions | undefined,
): Promise<StagedTrustReport> {
  const { manifestVersion, name } = entry
  let meta: PackumentMetaSlim | undefined
  try {
    meta = await getPackumentSlim(name, {
      __proto__: null,
      ...options,
      variant: 'full',
    } as GetPackumentSlimOptions)
  } catch (e) {
    if (httpStatusOf(e) === 404) {
      return classifyStagedTrust(name, { manifestVersion, meta: undefined })
    }
    throw e
  }
  return classifyStagedTrust(name, { manifestVersion, meta })
}

/**
 * Whether a report should fail the gate. `unpublished` passes — a roster entry
 * whose first publish (or in-flight bump) hasn't landed has nothing to gate.
 */
export function isStagedTrustFailure(report: StagedTrustReport): boolean {
  return report.verdict === 'not-staged'
}

/**
 * One-line summary of a report, for the passing/debug path.
 */
export function describeStagedTrust(report: StagedTrustReport): string {
  const {
    latestVersion,
    manifestVersion,
    manifestVersionIsPublished,
    publishedVersionCount,
    stagedVersionCount,
    verdict,
  } = report
  if (verdict === 'unpublished') {
    return manifestVersion
      ? `Staged publishing: not yet published (manifest declares ${manifestVersion})`
      : 'Staged publishing: not yet published'
  }
  const history = `${stagedVersionCount}/${publishedVersionCount} published version(s) staged`
  const pending =
    manifestVersion && !manifestVersionIsPublished
      ? `; manifest version ${manifestVersion} is not on the registry yet`
      : ''
  return `Staged publishing: latest ${latestVersion} is ${verdict === 'staged' ? 'staged' : 'NOT staged'} (${history})${pending}`
}

/**
 * Failure block for a `not-staged` report, in What / Where / Saw vs wanted /
 * Fix order.
 */
export function formatStagedTrustProblem(report: StagedTrustReport): string {
  const { latestVersion, name, publishedVersionCount, stagedVersionCount } =
    report
  const where = latestVersion
    ? `https://www.npmjs.com/package/${name}/access (latest is ${latestVersion})`
    : `https://www.npmjs.com/package/${name}/access`
  return [
    `What: ${name} publishes without npm staged publishing, so a release reaches consumers with no approval step.`,
    `Where: ${where}`,
    `Saw: ${stagedVersionCount} of ${publishedVersionCount} published version(s) carry the staged approver marker; dist-tag latest carries none.`,
    'Wanted: the version dist-tag latest points at published through the staged approval queue.',
    `Fix: set the package's trusted publisher "Allowed actions" to "npm stage publish" at the URL above, then republish. \`pnpm run npm:configure-staged --dry-run\` reports every package needing it; drop --dry-run to apply.`,
  ].join('\n')
}
