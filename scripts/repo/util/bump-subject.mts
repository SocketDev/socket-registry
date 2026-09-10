/**
 * @file The release SUBJECT tier of the scripts/repo/bump.mts overlay: the
 *   subject constants, the publish-wiring guard, the subject-bound npm release
 *   lane, the stale-tag-aware anchor derivation, and the prepared-release
 *   target detection. Pure and side-effect-free except for registry/git reads,
 *   so the overlay's decisions are unit-testable without a bump run.
 */

import { readFileSync } from 'node:fs'
import path from 'node:path'

import { gt } from '@socketsecurity/lib-stable/versions/compare'

import { parseChangelogCommits } from '../../fleet/changelog/commits.mts'
import {
  deriveReleaseCommits as deriveAnchoredReleaseCommits,
  lastReleaseTag,
  readCommitStream,
  resolveReleaseAnchor,
} from '../../fleet/lib/release-anchor.mts'
import { REPO_ROOT } from '../../fleet/paths.mts'
import {
  fetchLatestPublishedVersionChecked,
  fetchRegistryReleaseState,
} from '../../fleet/registry-infra/npm/registry.mts'

import {
  SUBJECT_MANIFEST_PATH,
  SUBJECT_NAME,
} from './bump-subject-decisions.mts'
import type { ManifestShape } from './bump-subject-decisions.mts'

export {
  preparedVersionFrom,
  SUBJECT_CHANGELOG_PATH,
  SUBJECT_MANIFEST_PATH,
  SUBJECT_NAME,
  subjectWiringError,
} from './bump-subject-decisions.mts'
export type { ManifestShape } from './bump-subject-decisions.mts'

import type {
  ReleaseDerivation,
  ReleaseLane,
} from '../../fleet/lib/release-anchor.mts'

export function readManifest(relPath: string): {
  raw: string
  parsed: ManifestShape
} {
  const raw = readFileSync(path.join(REPO_ROOT, relPath), 'utf8')
  return { parsed: JSON.parse(raw) as ManifestShape, raw }
}

/**
 * The npm binding of the shared anchor chain for the SUBJECT: the version
 * flip lives in registry/package.json, the publish ledger is the subject's
 * own npm packument.
 */
export function subjectReleaseLane(): ReleaseLane {
  return {
    async fetchLatest() {
      return await fetchLatestPublishedVersionChecked(SUBJECT_NAME)
    },
    async fetchPublishedAt(version) {
      const state = await fetchRegistryReleaseState(SUBJECT_NAME)
      return state?.timeMap[version]
    },
    manifestPath: SUBJECT_MANIFEST_PATH,
    parseManifestVersion(text) {
      try {
        const parsed = JSON.parse(text) as { version?: string | undefined }
        return typeof parsed.version === 'string' ? parsed.version : undefined
      } catch {
        return undefined
      }
    },
  }
}

/**
 * Subject derivation with the stale-tag law applied: when the newest
 * reachable `v*` tag names a version ABOVE registry latest — a tag for a
 * version that never shipped — anchor on REGISTRY LATEST with a loud warning
 * instead of folding the lying tag into the base the way the canonical
 * max(published, tag) base would; that base derives the NEXT version past the
 * never-published one and silently skips it. Everything else delegates to the
 * one shared derivation. The `warn` callback is injectable for tests.
 */
export async function deriveSubjectRelease(config: {
  cwd?: string | undefined
  manifestVersion: string
  warn: (msg: string) => void
}): Promise<ReleaseDerivation | undefined> {
  const {
    cwd = REPO_ROOT,
    manifestVersion,
    warn,
  } = { __proto__: null, ...config } as {
    cwd?: string | undefined
    manifestVersion: string
    warn: (msg: string) => void
  }
  const lane = subjectReleaseLane()
  const latestRead = await lane.fetchLatest()
  if (!latestRead.reachable) {
    return undefined
  }
  const published = latestRead.latest
  const fromTag = await lastReleaseTag(cwd)
  const tagVersion = fromTag?.replace(/^v/, '')
  if (published && tagVersion && gt(tagVersion, published)) {
    warn(
      `Tag ${fromTag} names ${tagVersion}, which the registry NEVER ` +
        `published — latest is ${published}. Anchoring on registry latest ` +
        `per the anchor law; deriving from the stale tag would skip the ` +
        `never-published version. Delete the stale tag (git tag -d ` +
        `${fromTag} && git push origin :refs/tags/${fromTag}) or publish ` +
        `${tagVersion} to clear this warning.`,
    )
    const anchor = await resolveReleaseAnchor({
      cwd,
      lane,
      prevVersion: published,
    })
    if (!anchor) {
      return undefined
    }
    return {
      anchor,
      base: published,
      commits: parseChangelogCommits(await readCommitStream(anchor, cwd)),
      fromTag,
      publishedVersion: published,
    }
  }
  return await deriveAnchoredReleaseCommits({ cwd, lane, manifestVersion })
}
