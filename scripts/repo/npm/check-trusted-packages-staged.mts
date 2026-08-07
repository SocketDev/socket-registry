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
 *   The roster is derived from `registry/manifest.json` UNIONED with the
 *   `packages/npm/*` working tree rather than a hardcoded list, and a manifest
 *   version that isn't on the registry yet is a pending bump, not a failure.
 *   The union matters: `update-manifest.mts` keeps a package whose npm `latest`
 *   is still the `0.0.0` name-reservation placeholder OUT of the manifest,
 *   because the manifest advertises usable overrides. A placeholder is exactly
 *   the package whose publishing trust has never been set up, so a
 *   manifest-only roster hides the packages that most need configuring. A
 *   registry read that fails for any reason other than a 404 propagates — a
 *   trust gate that reads green because a fetch died is worse than no gate.
 *   Pure classification lives in `classifyStagedTrust` so the verdict table is
 *   unit-testable without a network; `readStagedTrust` is the thin I/O wrapper
 *   around socket-lib's `getPackumentSlim`.
 */

import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

import { errorMessage } from '@socketsecurity/lib-stable/errors/message'
import {
  extractHttpStatus,
  getPackumentSlim,
} from '@socketsecurity/lib/npm/meta'

import { NPM_PACKAGES_PATH } from '../constants/paths.mts'
import { REPO_ROOT } from '../../fleet/paths.mts'

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
 * Derive the manifest half of the staged-publishing roster from a parsed
 * `registry/manifest.json`. The manifest is the authoritative list of what this
 * repo publishes as a usable override, so it is never a hardcoded array that
 * drifts the moment a package is added or dropped. Rows without a usable name
 * are skipped rather than guessed at. `loadStagedRoster` unions this with the
 * working tree, because the manifest deliberately omits `0.0.0` placeholders.
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
 * One `packages/npm/<dir>/package.json` row: the npm name this repo publishes
 * that directory under, and the version the working tree declares for it.
 */
export interface LocalPackageEntry {
  name: string
  version: string | undefined
}

/**
 * Union the manifest roster with the working-tree roster. A name in both keeps
 * its MANIFEST entry, which carries the version of record; a name only in the
 * working tree joins with its local version.
 *
 * This union is the whole point of the roster: a package whose npm `latest` is
 * still the `0.0.0` placeholder is absent from the manifest by design, and it
 * is precisely the package whose trusted publisher has never been configured.
 * Pure — the file reads live in `readLocalNpmPackages`.
 */
export function mergeStagedRosters(
  manifestRoster: readonly StagedRosterEntry[],
  localPackages: readonly LocalPackageEntry[],
): StagedRosterEntry[] {
  const byName = new Map<string, StagedRosterEntry>()
  for (let i = 0, { length } = localPackages; i < length; i += 1) {
    const local = localPackages[i]!
    if (local.name) {
      byName.set(local.name, {
        manifestVersion: local.version,
        name: local.name,
      })
    }
  }
  for (let i = 0, { length } = manifestRoster; i < length; i += 1) {
    const entry = manifestRoster[i]!
    byName.set(entry.name, entry)
  }
  return Array.from(byName.values()).toSorted((a, b) =>
    a.name.localeCompare(b.name),
  )
}

/**
 * Read every `packages/npm/*` package's name and version off the working tree.
 *
 * A subdirectory with no `package.json` is not a package and is skipped. A
 * `package.json` that exists but cannot be read or parsed THROWS: swallowing it
 * would drop a real package from the roster, and a package silently missing
 * from a trust roster reads as "nothing to configure".
 *
 * @throws {Error} When `packages/npm` cannot be listed, or when a package's
 *   `package.json` exists but is unreadable or malformed.
 */
export async function readLocalNpmPackages(): Promise<LocalPackageEntry[]> {
  let dirents
  try {
    dirents = await readdir(NPM_PACKAGES_PATH, { withFileTypes: true })
  } catch (e) {
    throw new Error(
      [
        'What: the working-tree package list could not be read, so the staged-publishing roster is incomplete.',
        `Where: ${NPM_PACKAGES_PATH}`,
        `Saw: ${errorMessage(e)}`,
        'Wanted: a readable directory of one subdirectory per published override package.',
        'Fix: confirm the checkout is complete (`git status`), then re-run.',
      ].join('\n'),
    )
  }
  const entries: LocalPackageEntry[] = []
  for (let i = 0, { length } = dirents; i < length; i += 1) {
    const dirent = dirents[i]!
    if (!dirent.isDirectory()) {
      continue
    }
    const pkgJsonPath = path.join(
      NPM_PACKAGES_PATH,
      dirent.name,
      'package.json',
    )
    let raw: string
    try {
      // Serial reads keep each parse error tied to its package.
      // eslint-disable-next-line no-await-in-loop -- serial
      raw = await readFile(pkgJsonPath, 'utf8')
    } catch (e) {
      if ((e as NodeJS.ErrnoException | undefined)?.code === 'ENOENT') {
        continue
      }
      throw new Error(
        [
          `What: ${dirent.name}'s package.json could not be read, so it would drop out of the staged-publishing roster unnoticed.`,
          `Where: ${pkgJsonPath}`,
          `Saw: ${errorMessage(e)}`,
          'Wanted: a readable package.json declaring the package name.',
          'Fix: restore the file from git, then re-run.',
        ].join('\n'),
      )
    }
    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch (e) {
      throw new Error(
        [
          `What: ${dirent.name}'s package.json is not valid JSON, so it would drop out of the staged-publishing roster unnoticed.`,
          `Where: ${pkgJsonPath}`,
          `Saw: ${errorMessage(e)}`,
          'Wanted: a parseable package.json declaring the package name.',
          'Fix: repair the JSON, then re-run.',
        ].join('\n'),
      )
    }
    const record = (parsed ?? {}) as { name?: unknown; version?: unknown }
    const name = typeof record.name === 'string' ? record.name : ''
    if (!name) {
      continue
    }
    entries.push({
      name,
      version: typeof record.version === 'string' ? record.version : undefined,
    })
  }
  return entries
}

/**
 * Read `registry/manifest.json`, union it with the `packages/npm/*` working
 * tree, and derive the roster, optionally narrowed to the scopes this repo
 * publishes. A roster name the registry has never seen classifies as
 * `unpublished` downstream, so "exists on npm" is decided by the registry read
 * rather than guessed at here.
 *
 * An unreadable manifest THROWS. Swallowing it would silently shrink the roster
 * to nothing and let the gate report success over an empty set — the exact
 * false-green this module exists to avoid.
 *
 * @throws {Error} When the manifest or the working-tree package list cannot be
 *   read or parsed.
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
        'Fix: regenerate it with `node scripts/repo/npm/update-manifest.mts`, or restore the file from git.',
      ].join('\n'),
    )
  }
  const roster = mergeStagedRosters(
    collectStagedRoster(manifest),
    await readLocalNpmPackages(),
  )
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
    if (extractHttpStatus(e) === 404) {
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
    `Fix: give the package a trusted publisher at the URL above — or, if one already exists, set its "Allowed actions" to "npm stage publish" — then republish. \`pnpm run npm:configure-staged\` reports every package needing it, creating or rebinding as each package requires; add --apply to write.`,
  ].join('\n')
}
