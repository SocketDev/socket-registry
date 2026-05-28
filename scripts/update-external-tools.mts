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

import crypto from 'node:crypto'
import { existsSync, promises as fs, readFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { Type } from '@sinclair/typebox'
import type { Static } from '@sinclair/typebox'

import { errorMessage } from '@socketsecurity/lib-stable/errors/message'
import { httpDownload } from '@socketsecurity/lib-stable/http-request/download'
import { getDefaultLogger } from '@socketsecurity/lib-stable/logger/default'
import { parseSchema } from '@socketsecurity/lib-stable/schema/parse'
import { spawn } from '@socketsecurity/lib-stable/process/spawn/child'

const logger = getDefaultLogger()

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(__dirname, '..')
const CONFIG_FILE = path.join(REPO_ROOT, 'external-tools.json')

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

interface GhAsset {
  browser_download_url: string
  name: string
}

interface GhRelease {
  assets: GhAsset[]
  published_at: string
  tag_name: string
}

export async function ghApiLatestRelease(
  repo: string,
  includePrerelease: boolean,
): Promise<GhRelease> {
  // Two tracks:
  //   stable     → `/releases/latest` returns the latest non-prerelease
  //                non-draft release. Good default for mature tools.
  //   prerelease → `/releases?per_page=20` + filter `prerelease: true`.
  //                We sort by created_at so the first match is newest.
  //                Used for tools we want to track ahead of stable
  //                (e.g. while a major was still in rc, we tracked
  //                pnpm@11.0.0-rc.x via this path; once stable 11
  //                shipped the pin moved back to the stable track).
  const endpoint = includePrerelease
    ? `repos/${repo}/releases?per_page=20`
    : `repos/${repo}/releases/latest`
  const result = await spawn('gh', ['api', endpoint, '--cache', '1h'], {
    stdio: 'pipe',
  })
  const stdout =
    typeof result.stdout === 'string'
      ? result.stdout
      : (result.stdout ?? Buffer.alloc(0)).toString()
  const parsed = JSON.parse(stdout) as GhRelease | GhRelease[]
  if (Array.isArray(parsed)) {
    // When on a prerelease track, only prerelease entries are
    // candidates. `prerelease` and `draft` are both advisory — GitHub
    // surfaces drafts only to authenticated callers, and we never
    // want to pin an unpublished asset.
    const newest = parsed.find(r => {
      const withFlags = r as GhRelease & {
        draft?: boolean | undefined
        prerelease?: boolean | undefined
      }
      return !withFlags.draft && withFlags.prerelease === true
    })
    if (!newest) {
      throw new Error(`No prerelease found for ${repo}`)
    }
    return newest
  }
  return parsed
}

export function isOlderThanCooldown(publishedAt: string): boolean {
  const published = new Date(publishedAt).getTime()
  return Date.now() - published >= COOLDOWN_MS
}

export function versionFromTag(tag: string): string {
  return tag.replace(/^v/, '')
}

/**
 * Compute a Subresource Integrity (SRI) string for a file. Format:
 * `sha256-<base64>`. Matches what npm / pnpm / browser `<script integrity>`
 * use natively — same alg can be substituted (sha384, sha512) without
 * changing call sites that just consume the string. Uses the one-shot
 * crypto.hash() API (Node 21.7+) — single Buffer read, no stream
 * overhead.
 */
export async function computeIntegrity(filePath: string): Promise<string> {
  const content = await fs.readFile(filePath)
  return `sha256-${crypto.hash('sha256', content, 'base64')}`
}

export async function computeIntegrityFromUrl(url: string): Promise<string> {
  const tmpFile = path.join(
    os.tmpdir(),
    `external-tools-update-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  )
  try {
    await httpDownload(url, tmpFile, { retries: 2 })
    return await computeIntegrity(tmpFile)
  } finally {
    // oxlint-disable-next-line socket/prefer-safe-delete -- finally cleanup with explicit catch
    await fs.unlink(tmpFile).catch(() => {})
  }
}

// Schema matches the sibling security-tools hook style (typebox +
// parseSchema via @socketsecurity/lib-stable/schema/parse). Keep the two in
// sync — both consume `external-tools.json`-shaped data.
//
// Two tool shapes are supported:
//   1. Single-flavor (pnpm, zizmor): `{ repository, platforms, … }`
//      with platforms at the top level.
//   2. Multi-flavor (sfw): `{ free: { repository, binaryName, platforms },
//      enterprise: { ... } }` — flavors carry their own repository
//      and per-platform integrity values while sharing one `version`.
//
// The `integrity` field is Subresource Integrity (SRI): `sha256-<base64>`
// (or `sha384-` / `sha512-`). Same shape npm / pnpm / browser
// `<script integrity>` consume natively. Source-of-truth is the field
// itself; the outer `platforms` map name describes the keying.
const platformEntrySchema = Type.Object({
  asset: Type.String(),
  integrity: Type.String({ pattern: '^sha(256|384|512)-[A-Za-z0-9+/=]+$' }),
})

const platformsSchema = Type.Record(Type.String(), platformEntrySchema)

const flavorSchema = Type.Object({
  repository: Type.String(),
  binaryName: Type.String(),
  platforms: platformsSchema,
})

// `version` is optional at the schema level because some entries (e.g.
// `rust`) declare a `minVersion` floor instead of a pinned version — they
// resolve at install time via rustup / runner toolcache, not via downloads
// from a fixed GitHub release. updateTool() enforces `version` at runtime
// only for entries with `release: 'asset'`; floor-shape entries skip the
// update path entirely.
const toolSchema = Type.Object({
  description: Type.Optional(Type.String()),
  repository: Type.Optional(Type.String()),
  version: Type.Optional(Type.String()),
  minVersion: Type.Optional(Type.String()),
  release: Type.Optional(Type.String()),
  platforms: Type.Optional(platformsSchema),
  free: Type.Optional(flavorSchema),
  enterprise: Type.Optional(flavorSchema),
  notes: Type.Optional(Type.Union([Type.String(), Type.Array(Type.String())])),
  // Catch-all so floor-shape entries (rust: minLlvmVersion, components,
  // …) don't trip schema validation. Stricter per-tool typing belongs in
  // the entry's own validator, not this aggregate schema.
}, { additionalProperties: true })

const rootConfigSchema = Type.Record(Type.String(), toolSchema)

type PlatformEntry = Static<typeof platformEntrySchema>
type RootConfig = Static<typeof rootConfigSchema>

export function readConfig(): RootConfig {
  const raw = JSON.parse(readFileSync(CONFIG_FILE, 'utf8'))
  return parseSchema(rootConfigSchema, raw)
}

export async function writeConfig(config: RootConfig): Promise<void> {
  await fs.writeFile(
    CONFIG_FILE,
    JSON.stringify(config, undefined, 2) + '\n',
    'utf8',
  )
}

export function ownerAndNameFromRepository(
  repository: string | undefined,
): string {
  if (!repository) {
    throw new Error('Missing `repository` field on tool entry')
  }
  // Accept either "github:owner/name" or "owner/name".
  const idx = repository.indexOf(':')
  return idx === -1 ? repository : repository.slice(idx + 1)
}

interface UpdateResult {
  tool: string
  skipped: boolean
  updated: boolean
  reason: string
}

/**
 * Recompute every platform integrity in the supplied map against the
 * resolved GitHub release. Mutates the map in place and returns a fresh
 * object with the new entries. Shared by the single-flavor and
 * per-flavor code paths.
 */
export async function recomputePlatforms(
  label: string,
  repo: string,
  release: GhRelease,
  platforms: Record<string, PlatformEntry>,
): Promise<Record<string, PlatformEntry>> {
  const newPlatforms: Record<string, PlatformEntry> = {}
  for (const [platform, entry] of Object.entries(platforms)) {
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
    release = await ghApiLatestRelease(primaryRepo, includePrerelease)
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
        flavorRelease = await ghApiLatestRelease(flavorRepo, includePrerelease)
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
