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

import { changelogHasVersionSection } from '../../fleet/bump.mts'
import { parseConventionalCommits } from '../../fleet/lib/changelog.mts'
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
} from '../../fleet/publish-infra/npm/registry.mts'

import type {
  ReleaseDerivation,
  ReleaseLane,
} from '../../fleet/lib/release-anchor.mts'

/**
 * The release subject: the ONE published package this monorepo releases
 * through the fleet npm-publish path. Repo-relative paths so the shared
 * anchor chain's `git show <ref>:<path>` probes resolve.
 */
export const SUBJECT_NAME = '@socketsecurity/registry'
export const SUBJECT_MANIFEST_PATH = 'registry/package.json'
export const SUBJECT_CHANGELOG_PATH = 'registry/CHANGELOG.md'

export interface ManifestShape {
  name?: string | undefined
  private?: boolean | undefined
  publishConfig?: { directory?: string | undefined } | undefined
  repository?: { url?: string | undefined } | string | undefined
  version?: string | undefined
}

export function readManifest(relPath: string): {
  raw: string
  parsed: ManifestShape
} {
  const raw = readFileSync(path.join(REPO_ROOT, relPath), 'utf8')
  return { parsed: JSON.parse(raw) as ManifestShape, raw }
}

/**
 * The publish-wiring invariant the staged leg depends on, as a pure check:
 * the root manifest must be `private: true` — never itself publishable — and
 * must redirect `pnpm stage publish` at the repo root into the subject via
 * `publishConfig.directory`. Returns the failure text, or undefined when the
 * wiring holds.
 */
export function subjectWiringError(rootPkg: ManifestShape): string | undefined {
  const expectedDirectory = path.dirname(SUBJECT_MANIFEST_PATH)
  if (rootPkg.private !== true) {
    return (
      `root package.json must stay "private": true — the monorepo root is ` +
      `never published; the release subject is ${SUBJECT_NAME} at ` +
      `${SUBJECT_MANIFEST_PATH}.`
    )
  }
  if (rootPkg.publishConfig?.directory !== expectedDirectory) {
    return (
      `root package.json is missing publishConfig.directory: ` +
      `"${expectedDirectory}". The cascade-owned npm-publish.mts --staged ` +
      `runs \`pnpm stage publish\` from the REPO ROOT, and pnpm does not ` +
      `refuse a private manifest on that path — without the redirect the ` +
      `staged leg uploads the PRIVATE ROOT instead of ${SUBJECT_NAME}. ` +
      `Restore the publishConfig block before releasing.`
    )
  }
  return undefined
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
 * one shared derivation. The `warn` seam is injectable for tests.
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
      commits: parseConventionalCommits(await readCommitStream(anchor, cwd)),
      fromTag,
      publishedVersion: published,
    }
  }
  return await deriveAnchoredReleaseCommits({ cwd, lane, manifestVersion })
}

/**
 * The prepared-release target: when the subject manifest already reads a
 * version AHEAD of the released base and the subject changelog already
 * carries that version's section, a bump commit prepared that release — the
 * manifest version is the target, like a committed `-prerelease` hint. A
 * manifest merely ahead WITHOUT its changelog section is not a prepared
 * release — that is the pre-bump drift resolveBumpBase exists to neutralize —
 * and a major jump still requires the explicit human `--release-as major`.
 * Returns undefined when no prepared release applies. Pure.
 */
export function preparedVersionFrom(config: {
  base: string
  changelog: string
  manifestVersion: string
}): string | undefined {
  const cfg = { __proto__: null, ...config } as {
    base: string
    changelog: string
    manifestVersion: string
  }
  const { base, changelog, manifestVersion } = cfg
  if (!/^\d+\.\d+\.\d+$/.test(manifestVersion)) {
    return undefined
  }
  if (!gt(manifestVersion, base)) {
    return undefined
  }
  if (manifestVersion.split('.')[0] !== base.split('.')[0]) {
    return undefined
  }
  if (!changelogHasVersionSection(changelog, manifestVersion)) {
    return undefined
  }
  return manifestVersion
}
