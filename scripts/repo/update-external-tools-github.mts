/**
 * @file GitHub release-API and Subresource-Integrity helpers for the
 *   external-tools updater: fetch the latest (or a tagged) release, resolve a
 *   pinned version's real release across tag forms, and compute SRI hashes from
 *   a file or a download URL. Split out of update-external-tools.mts so that
 *   orchestrator stays under the file-size soft cap.
 */

import crypto from 'node:crypto'
import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { httpDownload } from '@socketsecurity/lib-stable/http-request/download'
import { spawn } from '@socketsecurity/lib-stable/process/spawn/child'

export interface GhAsset {
  browser_download_url: string
  name: string
}

export interface GhRelease {
  assets: GhAsset[]
  published_at: string
  tag_name: string
}

export interface GhApiLatestReleaseConfig {
  includePrerelease: boolean
}

export async function ghApiLatestRelease(
  repo: string,
  config: GhApiLatestReleaseConfig,
): Promise<GhRelease> {
  const { includePrerelease } = {
    __proto__: null,
    ...config,
  } as typeof config
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
  const parsed = JSON.parse(result.stdout) as GhRelease | GhRelease[]
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

// Fetch a specific release by tag (vs the latest). Used by the one-shot sha512
// migration (remove with migrateTool once migrated): re-hashing a PINNED
// version needs that version's real release — its actual `tag_name` and real
// asset `browser_download_url`s — not a synthesized URL (tag formats vary per
// tool: `v1.5.1` vs `1.5.1`). Returns undefined on 404 so the caller can try
// the other tag form.
export async function ghApiReleaseByTag(
  repo: string,
  tag: string,
): Promise<GhRelease | undefined> {
  try {
    const result = await spawn(
      'gh',
      ['api', `repos/${repo}/releases/tags/${tag}`, '--cache', '1h'],
      { stdio: 'pipe' },
    )
    return JSON.parse(result.stdout) as GhRelease
  } catch {
    return undefined
  }
}

// Resolve the real release for a pinned version, trying the common tag forms
// (`v<version>` then `<version>`). Returns undefined when neither resolves
// (asset genuinely gone — surfaced loudly by the caller, never silently skipped).
export async function resolvePinnedRelease(
  repo: string,
  version: string,
): Promise<GhRelease | undefined> {
  return (
    (await ghApiReleaseByTag(repo, `v${version}`)) ??
    (await ghApiReleaseByTag(repo, version))
  )
}

/**
 * Compute a Subresource Integrity (SRI) string for a file. Format:
 * `sha512-<base64>` — the fleet OUR-side integrity standard. Matches what npm /
 * pnpm / browser `<script integrity>` consume natively. Uses the one-shot
 * crypto.hash() API (Node 21.7+) — single Buffer read, no stream overhead.
 */
export async function computeIntegrity(filePath: string): Promise<string> {
  const content = await fs.readFile(filePath)
  return `sha512-${crypto.hash('sha512', content, 'base64')}`
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
