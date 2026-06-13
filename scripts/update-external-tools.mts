#!/usr/bin/env node
/**
 * Update the repo-root `external-tools.json` to pick up new releases of every
 * tool listed with `"release": "asset"` (today: pnpm, zizmor).
 *
 * Contract for this file:
 *
 * - Read minimumReleaseAge from pnpm-workspace.yaml (minutes → ms). Skip releases
 *   younger than the cooldown window to dodge malicious fresh uploads (matches
 *   `.claude/hooks/setup-security-tools/update.mts` behavior).
 * - For each tool, hit `repos/<owner>/<name>/releases/latest`. Compare `tag_name`
 *   (stripping any leading `v`) against the pinned `version`. If newer AND past
 *   cooldown, download every listed platform asset, recompute sha256, and
 *   rewrite the entry.
 * - Invoked by the `updating` umbrella skill; runnable standalone via `pnpm run
 *   update:external-tools` (exposed in package.json).
 * - Exits 0 on success, 1 on any HTTP / parse / download failure.
 *
 * The sibling script under `.claude/hooks/setup-security-tools/update.mts`
 * targets a DIFFERENT file (the hook's colocated tools manifest) and has a
 * different schema. Keep the two independent — merging would require either
 * schema convergence or conditional code paths and the benefit is minimal since
 * each script only handles 2–3 tools.
 */

import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { getDefaultLogger } from '@socketsecurity/lib-stable/logger/default'

import {
  CONFIG_FILE,
  ownerAndNameFromRepository,
  readConfig,
  writeConfig,
} from './update-external-tools-config.mts'
import type {
  PlatformEntry,
  RootConfig,
  UpdateResult,
} from './update-external-tools-config.mts'
import {
  computeIntegrityFromUrl,
  ghApiLatestRelease,
  resolvePinnedRelease,
} from './update-external-tools-github.mts'
import type { GhRelease } from './update-external-tools-github.mts'
import { migrateTool } from './update-external-tools-migrate.mts'

const logger = getDefaultLogger()

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(__dirname, '..')

const MS_PER_MINUTE = 60_000
const DEFAULT_COOLDOWN_MINUTES = 10_080

export function readCooldownMs(): number {
  const candidate = path.join(REPO_ROOT, 'pnpm-workspace.yaml')
  if (existsSync(candidate)) {
    try {
      const content = readFileSync(candidate, 'utf8')
      const match = /^minimumReleaseAge:\s*(\d+)/m.exec(content)
      if (match) {
        return Number(match[1]) * MS_PER_MINUTE
      }
    } catch {
      // Read error.
    }
    logger.warn(
      `Could not read minimumReleaseAge from ${candidate}, defaulting to ${DEFAULT_COOLDOWN_MINUTES} minutes`,
    )
  } else {
    logger.warn(
      `pnpm-workspace.yaml not found, defaulting cooldown to ${DEFAULT_COOLDOWN_MINUTES} minutes`,
    )
  }
  return DEFAULT_COOLDOWN_MINUTES * MS_PER_MINUTE
}

const COOLDOWN_MS = readCooldownMs()

export function isOlderThanCooldown(publishedAt: string): boolean {
  const published = new Date(publishedAt).getTime()
  return Date.now() - published >= COOLDOWN_MS
}

// A dated soak bypass applies to `latestVersion` when it names that exact
// version and today is on/before its `removable` date. The `removable` date
// (published + the soak window) auto-disarms the bypass so a forgotten entry
// can't grant a permanent waiver.
export function soakBypassApplies(
  bypass:
    | { version?: string | undefined; removable?: string | undefined }
    | undefined,
  latestVersion: string,
): boolean {
  if (!bypass || bypass.version !== latestVersion || !bypass.removable) {
    return false
  }
  const removable = new Date(`${bypass.removable}T23:59:59Z`).getTime()
  return Number.isFinite(removable) && Date.now() <= removable
}

export function versionFromTag(tag: string): string {
  return tag.replace(/^v/, '')
}

/**
 * Recompute every platform integrity in the supplied map against the resolved
 * GitHub release. Mutates the map in place and returns a fresh object with the
 * new entries. Shared by the single-flavor and per-flavor code paths.
 */
// Rewrite a version-embedded npm-tarball asset name to the new version, e.g.
// `pnpm-11.5.1.tgz` (npmPackage `pnpm`, old `11.5.1`, new `11.6.0`) →
// `pnpm-11.6.0.tgz`. Only substitutes the exact `<pkg>-<oldVersion>.tgz`
// shape; anything else is returned unchanged.
export function npmTarballAssetForVersion(
  assetName: string,
  npmPackage: string,
  oldVersion: string,
  newVersion: string,
): string {
  const expected = `${npmPackage}-${oldVersion}.tgz`
  return assetName === expected ? `${npmPackage}-${newVersion}.tgz` : assetName
}

export async function recomputePlatforms(
  label: string,
  repo: string,
  release: GhRelease,
  platforms: Record<string, PlatformEntry>,
  versions?: { npmPackage: string; oldVersion: string; newVersion: string },
): Promise<Record<string, PlatformEntry>> {
  const newPlatforms: Record<string, PlatformEntry> = {}
  for (const [platform, entry] of Object.entries(platforms)) {
    // npm-tarball pin (`<pkg>-<version>.tgz`): the registry artifact, not a GH
    // release asset (e.g. pnpm darwin-x64, which ships the npm JS tarball run
    // through system Node — its SEA binary was dropped in 11.0.5). Rewrite the
    // embedded version and fetch integrity from the npm registry.
    if (entry.asset.endsWith('.tgz') && versions) {
      const asset = npmTarballAssetForVersion(
        entry.asset,
        versions.npmPackage,
        versions.oldVersion,
        versions.newVersion,
      )
      const url = `https://registry.npmjs.org/${versions.npmPackage}/-/${asset}`
      logger.log(`  ${label}/${platform}: hashing ${asset} (npm registry)`)
      // eslint-disable-next-line no-await-in-loop
      const integrity = await computeIntegrityFromUrl(url)
      newPlatforms[platform] = { asset, integrity }
      continue
    }
    // Re-resolve the asset name against the latest release's asset
    // list. Most tools reuse the same filename pattern across
    // releases, but a tool might rename assets between versions
    // (e.g. pnpm's Windows asset layout changed pre-v10). Prefer a
    // case-insensitive exact match on the pinned asset name; fall
    // back to the pinned name if the release listing is missing it
    // (computeIntegrityFromUrl will surface a 404 loudly in that case).
    const pinnedAsset = entry.asset
    const asset = release.assets.find(
      a => a.name.toLowerCase() === pinnedAsset.toLowerCase(),
    ) ??
      release.assets.find(a => a.name === pinnedAsset) ?? {
        browser_download_url: `https://github.com/${repo}/releases/download/${release.tag_name}/${pinnedAsset}`,
        name: pinnedAsset,
      }

    logger.log(`  ${label}/${platform}: hashing ${asset.name}`)
    // eslint-disable-next-line no-await-in-loop
    const integrity = await computeIntegrityFromUrl(asset.browser_download_url)
    newPlatforms[platform] = { asset: asset.name, integrity }
  }
  return newPlatforms
}

export async function updateTool(
  name: string,
  config: RootConfig,
): Promise<UpdateResult> {
  logger.log(`=== Checking ${name} ===`)

  const toolConfig = config[name]
  if (!toolConfig) {
    return {
      tool: name,
      skipped: true,
      updated: false,
      reason: 'not in config',
    }
  }

  // Only tools that distribute via GitHub release assets are managed
  // here. Others (e.g. runtime-resolved pins) stay manual.
  if (toolConfig.release !== 'asset') {
    return {
      tool: name,
      skipped: true,
      updated: false,
      reason: `release type is ${toolConfig.release ?? 'unset'}, only "asset" is supported`,
    }
  }

  // Detect multi-flavor shape: tools like `sfw` ship as `free` and
  // `enterprise` flavors. Each flavor carries its own `repository`
  // and `platforms`; only `version` is shared at the top level.
  // Single-flavor tools carry `repository` + `platforms` at the top.
  const flavors: Array<{ key: 'free' | 'enterprise' }> = []
  if (toolConfig.free?.platforms) {
    flavors.push({ key: 'free' })
  }
  if (toolConfig.enterprise?.platforms) {
    flavors.push({ key: 'enterprise' })
  }
  const isMultiFlavor = flavors.length > 0

  // All tracked tools follow the stable release channel. pnpm 11 used
  // to ship as `prerelease: true` while stable stayed on 10.x — once
  // pnpm 11 went GA the prerelease pin became wrong (stale prereleases
  // would shadow newer stables). If a future tool legitimately needs
  // the prerelease track, add it to an explicit allowlist here rather
  // than reverting to a version-string heuristic.
  const includePrerelease = false

  // Resolve the canonical release used for the version comparison.
  // For multi-flavor tools we anchor on the first flavor's repo —
  // flavors are expected to ship in lockstep (the schema enforces
  // a shared top-level `version`).
  const primaryRepo = ownerAndNameFromRepository(
    isMultiFlavor
      ? toolConfig[flavors[0]!.key]!.repository
      : toolConfig.repository,
  )

  let release: GhRelease
  try {
    release = await ghApiLatestRelease(primaryRepo, { includePrerelease })
  } catch (e) {
    const msg = errorMessage(e)
    logger.warn(`Failed to fetch ${name} releases: ${msg}`)
    return {
      tool: name,
      skipped: true,
      updated: false,
      reason: `API error: ${msg}`,
    }
  }

  const latestVersion = versionFromTag(release.tag_name)
  const currentVersion = toolConfig.version
  logger.log(`Current: v${currentVersion}, Latest: v${latestVersion}`)

  if (latestVersion === currentVersion) {
    logger.log('Already current.')
    return {
      tool: name,
      skipped: false,
      updated: false,
      reason: 'already current',
    }
  }

  if (!isOlderThanCooldown(release.published_at)) {
    const daysOld = (
      (Date.now() - new Date(release.published_at).getTime()) /
      86_400_000
    ).toFixed(1)
    const cooldownDays = (COOLDOWN_MS / 86_400_000).toFixed(0)
    if (soakBypassApplies(toolConfig.soakBypass, latestVersion)) {
      logger.log(
        `v${latestVersion} is only ${daysOld} days old (need ${cooldownDays}) — accepting via soakBypass (removable ${toolConfig.soakBypass!.removable}).`,
      )
    } else {
      logger.log(
        `v${latestVersion} is only ${daysOld} days old (need ${cooldownDays}). Skipping.`,
      )
      return {
        tool: name,
        skipped: true,
        updated: false,
        reason: `too new (${daysOld} days, need ${cooldownDays})`,
      }
    }
  }

  logger.log(`Updating ${name} to v${latestVersion}...`)

  if (isMultiFlavor) {
    // Resolve and hash each flavor against ITS OWN repository. Without
    // this loop the per-flavor integrity values would stay pinned to
    // the old release while `version` advanced — silent corruption.
    for (const { key } of flavors) {
      const flavor = toolConfig[key]!
      const flavorRepo = ownerAndNameFromRepository(flavor.repository)
      let flavorRelease: GhRelease = release
      if (flavorRepo !== primaryRepo) {
        // eslint-disable-next-line no-await-in-loop
        flavorRelease = await ghApiLatestRelease(flavorRepo, {
          includePrerelease,
        })
      }
      // eslint-disable-next-line no-await-in-loop
      flavor.platforms = await recomputePlatforms(
        key,
        flavorRepo,
        flavorRelease,
        flavor.platforms,
      )
    }
  } else {
    const repo = ownerAndNameFromRepository(toolConfig.repository)
    toolConfig.platforms = await recomputePlatforms(
      name,
      repo,
      release,
      toolConfig.platforms ?? {},
      {
        npmPackage: name,
        oldVersion: currentVersion,
        newVersion: latestVersion,
      },
    )
  }

  toolConfig.version = latestVersion

  return {
    tool: name,
    skipped: false,
    updated: true,
    reason: `bumped to v${latestVersion}`,
  }
}

async function main(): Promise<void> {
  const migrate = process.argv.includes('--migrate')
  if (migrate) {
    const config = readConfig()
    const results: UpdateResult[] = []
    for (const name of Object.keys(config)) {
      // eslint-disable-next-line no-await-in-loop
      results.push(await migrateTool(name, config))
    }
    if (results.some(r => r.updated)) {
      await writeConfig(config)
      logger.log('')
      logger.log(`Wrote ${CONFIG_FILE} (sha512 migration)`)
    }
    logger.log('')
    logger.log('Migration summary:')
    for (let i = 0, { length } = results; i < length; i += 1) {
      const r = results[i]!
      const tag = r.updated ? 're-hashed' : 'skipped'
      logger.log(`  ${r.tool}: ${tag} (${r.reason})`)
    }
    return
  }
  await runUpdate()
}

async function runUpdate(): Promise<void> {
  const config = readConfig()
  const results: UpdateResult[] = []

  for (const name of Object.keys(config)) {
    // eslint-disable-next-line no-await-in-loop
    const r = await updateTool(name, config)
    results.push(r)
  }

  const updated = results.filter(r => r.updated)
  if (updated.length > 0) {
    await writeConfig(config)
    logger.log('')
    logger.log(`Wrote ${CONFIG_FILE}`)
  }

  logger.log('')
  logger.log('Summary:')
  for (let i = 0, { length } = results; i < length; i += 1) {
    const r = results[i]
    const tag = r.updated ? 'updated' : r.skipped ? 'skipped' : 'unchanged'
    logger.log(`  ${r.tool}: ${tag} (${r.reason})`)
  }
}

main().catch((e: unknown) => {
  logger.error(e)
  process.exitCode = 1
})
