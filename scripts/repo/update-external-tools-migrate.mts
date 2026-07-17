/**
 * @file One-shot sha256 → sha512 integrity migration for `external-tools.json`.
 *   Re-hashes each pinned platform asset of an already-pinned version as
 *   sha512, resilient to per-platform fetch failures (a bad pin is left at
 *   sha256, never dropped). Removable once every entry is on sha512. Split out
 *   of update-external-tools.mts to keep that orchestrator under the file-size
 *   cap.
 */

import { errorMessage } from '@socketsecurity/lib-stable/errors/message'
import { getDefaultLogger } from '@socketsecurity/lib-stable/logger/default'

import type {
  PlatformEntry,
  RootConfig,
  UpdateResult,
} from './update-external-tools-config.mts'
import { ownerAndNameFromRepository } from './update-external-tools-config.mts'
import {
  computeIntegrityFromUrl,
  resolvePinnedRelease,
} from './update-external-tools-github.mts'
import type { GhRelease } from './update-external-tools-github.mts'

const logger = getDefaultLogger()

interface MigrateFailure {
  platform: string
  asset: string
  reason: string
}

// Resilient per-platform re-hash for migration: resolve each platform's real
// download URL (GH release asset, else npm-registry tarball for `*.tgz`, else
// the GH releases/download fallback), recompute sha512, and record — never
// throw — per-platform failures so one bad pin doesn't abort the whole run.
async function migratePlatforms(
  label: string,
  repo: string,
  npmPackage: string,
  release: GhRelease,
  platforms: Record<string, PlatformEntry>,
  failures: MigrateFailure[],
): Promise<Record<string, PlatformEntry>> {
  const out: Record<string, PlatformEntry> = {}
  for (const [platform, entry] of Object.entries(platforms)) {
    const assetName = entry.asset
    // An npm tarball pin (`<pkg>-<version>.tgz`) is the registry artifact, not a
    // GH release asset — fetch it from the npm registry.
    const isNpmTarball = assetName.endsWith('.tgz')
    const ghAsset = release.assets.find(
      a => a.name.toLowerCase() === assetName.toLowerCase(),
    )
    const url = isNpmTarball
      ? `https://registry.npmjs.org/${npmPackage}/-/${assetName}`
      : (ghAsset?.browser_download_url ??
        `https://github.com/${repo}/releases/download/${release.tag_name}/${assetName}`)
    logger.log(`  ${label}/${platform}: hashing ${assetName}`)
    try {
      // eslint-disable-next-line no-await-in-loop
      const integrity = await computeIntegrityFromUrl(url)
      out[platform] = { asset: assetName, integrity }
    } catch (e) {
      failures.push({
        platform: `${label}/${platform}`,
        asset: assetName,
        reason: errorMessage(e),
      })
      // Keep the existing (sha256) entry so we don't drop the pin.
      out[platform] = entry
    }
  }
  return out
}

export async function migrateTool(
  name: string,
  config: RootConfig,
): Promise<UpdateResult> {
  logger.log(`=== Migrating ${name} (sha256 -> sha512) ===`)
  const toolConfig = config[name]
  if (!toolConfig || toolConfig.release !== 'asset') {
    return {
      tool: name,
      skipped: true,
      updated: false,
      reason: 'not an asset tool',
    }
  }
  const flavors: Array<{ key: 'free' | 'enterprise' }> = []
  if (toolConfig.free?.platforms) {
    flavors.push({ key: 'free' })
  }
  if (toolConfig.enterprise?.platforms) {
    flavors.push({ key: 'enterprise' })
  }
  const version = toolConfig.version
  if (!version) {
    return {
      tool: name,
      skipped: true,
      updated: false,
      reason: 'no pinned version',
    }
  }
  const failures: MigrateFailure[] = []
  if (flavors.length > 0) {
    for (const { key } of flavors) {
      const flavor = toolConfig[key]!
      const flavorRepo = ownerAndNameFromRepository(flavor.repository)
      // eslint-disable-next-line no-await-in-loop
      const release = await resolvePinnedRelease(flavorRepo, version)
      if (!release) {
        return {
          tool: name,
          skipped: true,
          updated: false,
          reason: `no release for ${flavorRepo}@${version} (tried v${version} / ${version})`,
        }
      }
      // npm-package name for a `.tgz` fallback: the binaryName, else repo basename.
      const npmPackage = flavor.binaryName ?? flavorRepo.split('/').pop() ?? key
      // eslint-disable-next-line no-await-in-loop
      flavor.platforms = await migratePlatforms(
        key,
        flavorRepo,
        npmPackage,
        release,
        flavor.platforms,
        failures,
      )
    }
  } else {
    const repo = ownerAndNameFromRepository(toolConfig.repository)
    const release = await resolvePinnedRelease(repo, version)
    if (!release) {
      return {
        tool: name,
        skipped: true,
        updated: false,
        reason: `no release for ${repo}@${version} (tried v${version} / ${version})`,
      }
    }
    // npm-package name for a `.tgz` fallback: the tool name (matches npm dist).
    toolConfig.platforms = await migratePlatforms(
      name,
      repo,
      name,
      release,
      toolConfig.platforms ?? {},
      failures,
    )
  }
  if (failures.length > 0) {
    for (let i = 0, { length } = failures; i < length; i += 1) {
      const f = failures[i]!
      logger.warn(`  ${f.platform} (${f.asset}): ${f.reason}`)
    }
    return {
      tool: name,
      skipped: false,
      updated: true,
      reason: `re-hashed v${version} (${failures.length} platform(s) failed — left sha256)`,
    }
  }
  return {
    tool: name,
    skipped: false,
    updated: true,
    reason: `re-hashed v${version} as sha512`,
  }
}
