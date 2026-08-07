/**
 * @file The CI lane of the family publish: walk the registry's unpublished
 *   version-bump commits, hand each to the per-commit staging leg
 *   (publish-npm-packages-commit.mts) in chronological order, and collect every
 *   package's failure so the caller can exit 1 on any of them.
 *   Split out of publish-npm-packages.mts so that entry stays a thin lane
 *   router alongside its -git / -commit / -publish / -needs / -dispatch /
 *   -failures siblings.
 *   This runs in GitHub Actions only. It reaches the one fleet-owned npm upload
 *   through `publishPackages`, which needs the workflow's OIDC identity — a
 *   local run has no such token, so the local lane dispatches the workflow
 *   instead of calling this.
 */

import { getDefaultLogger } from '@socketsecurity/lib-stable/logger/default'
import { fetchPackageManifest } from '@socketsecurity/lib-stable/packages/manifest'
import { spawn } from '@socketsecurity/lib-stable/process/spawn/child'
import { pluralize } from '@socketsecurity/lib-stable/words/pluralize'
// oxlint-disable-next-line socket/prefer-lib-versions-over-semver -- @socketsecurity/lib-stable has no ./external/semver export at the pinned version; semver is a devDependency (scripts/tests only, not bundled).
import semver from 'semver'

import { REGISTRY_PKG_PATH } from '../constants/paths.mts'
import {
  publishAtCommit,
  requirePackageJson,
} from './publish-npm-packages-commit.mts'
import type {
  PublishFailure,
  PublishState,
} from './publish-npm-packages-failures.mts'
import {
  checkoutCommit,
  ensureNpmVersion,
  findVersionBumpCommits,
  getCommitSha,
  getCurrentBranch,
} from './publish-npm-packages-git.mts'

import type { NpmManifest } from '../util/manifest-types.mts'

const logger = getDefaultLogger()

// How many version-bump commits to list before truncating; --debug lists all.
const COMMIT_PREVIEW_LIMIT = 10

export interface StagingLaneOptions {
  debug?: boolean | undefined
  distTag?: string | undefined
  dryRun?: boolean | undefined
  /**
   * Stage at HEAD, skipping version-bump commit detection. This is what the
   * workflow dispatches with: CI is already checked out at the ref being
   * published.
   */
  forcePublish?: boolean | undefined
  forceRegistry?: boolean | undefined
  only?: string | undefined
  skipNpmPackages?: boolean | undefined
}

/**
 * Stage every needs-publish package, returning the collected failures.
 *
 * The return value is the whole point: the previous shape logged
 * `Unable to publish 9 packages` and threw the list away, so the run exited 0
 * with nine packages unpublished.
 */
export async function stageNeedsPublishPackages(
  options: StagingLaneOptions,
): Promise<PublishState> {
  const {
    debug = false,
    distTag,
    dryRun = false,
    forcePublish = false,
    forceRegistry = false,
    only,
    skipNpmPackages = false,
  } = { __proto__: null, ...options } as StagingLaneOptions

  // Ensure npm version is >= 11.5.1 for trusted publishing before any
  // publish-side operation.
  await ensureNpmVersion()

  const originalBranch = await getCurrentBranch()
  const originalSha = await getCommitSha('HEAD')

  const commitOptions = {
    distTag,
    dryRun,
    forceRegistry,
    only,
    skipNpmPackages,
  }

  const state: PublishState = { fails: [], failures: [], skipped: [] }
  const collect = (result: {
    fails: string[]
    failures: PublishFailure[]
    skipped: string[]
  }): void => {
    state.fails.push(...result.fails)
    state.failures?.push(...result.failures)
    state.skipped?.push(...result.skipped)
  }

  try {
    await walkCommits({
      collect,
      commitOptions,
      debug,
      forcePublish,
      forceRegistry,
      skipNpmPackages,
    })
  } finally {
    await restoreWorktree({ dryRun, originalBranch, originalSha })
  }

  return state
}

interface WalkCommitsConfig {
  collect: (result: {
    fails: string[]
    failures: PublishFailure[]
    skipped: string[]
  }) => void
  commitOptions: {
    distTag?: string | undefined
    dryRun?: boolean | undefined
    forceRegistry?: boolean | undefined
    only?: string | undefined
    skipNpmPackages?: boolean | undefined
  }
  debug: boolean
  forcePublish: boolean
  forceRegistry: boolean
  skipNpmPackages: boolean
}

/**
 * Decide which commits to stage at, and stage at each of them.
 */
async function walkCommits(config: WalkCommitsConfig): Promise<void> {
  const {
    collect,
    commitOptions,
    debug,
    forcePublish,
    forceRegistry,
    skipNpmPackages,
  } = config

  if (forcePublish) {
    logger.log('Running with --force-publish')
    logger.log('Force publish mode: skipping commit detection')
    collect(await publishAtCommit(await getCommitSha('HEAD'), commitOptions))
    return
  }

  if (forceRegistry) {
    logger.log('Running with --force-registry')
    logger.log(
      'Registry package will be force-published regardless of version changes',
    )
  }

  if (skipNpmPackages) {
    logger.log('Running with --skip-npm-packages')
    logger.log('NPM override packages (packages/*) will be skipped')
  }

  const bumpCommits = await findVersionBumpCommits()

  if (!bumpCommits.length) {
    logger.info('No version bump commits found')
    if (forceRegistry) {
      logger.log('')
      logger.log(
        'Force-registry flag is set, checking HEAD for unpublished packages…',
      )
      collect(await publishAtCommit(await getCommitSha('HEAD'), commitOptions))
    }
    return
  }

  // Sort by version descending (highest to lowest).
  bumpCommits.sort((a, b) => semver.compare(b.version, a.version))

  // Check the registry package for the latest published version.
  const registryPkgJson = requirePackageJson(REGISTRY_PKG_PATH)
  const registryManifest = (await fetchPackageManifest(
    `${registryPkgJson.name}@latest`,
  )) as NpmManifest | undefined

  if (registryManifest) {
    const publishedVersion = registryManifest.version
    logger.info(`Latest published: ${registryPkgJson.name}@${publishedVersion}`)
    const newerCommits = bumpCommits.filter(commit =>
      semver.gt(commit.version, publishedVersion),
    )
    bumpCommits.length = 0
    bumpCommits.push(...newerCommits)
  } else {
    logger.info(`Latest published: ${registryPkgJson.name}@<not yet published>`)
  }

  if (!bumpCommits.length) {
    logger.info('No registry version bumps to publish')
    logger.log('')
    logger.log('Checking for unpublished packages at HEAD…')
    // Even without a registry version bump, an @socketregistry/* package can
    // still be unpublished — that is exactly the case that went unnoticed.
    collect(await publishAtCommit(await getCommitSha('HEAD'), commitOptions))
    return
  }

  logger.log('')
  logger
    .log(
      `Publishing ${bumpCommits.length} unpublished version ${pluralize('bump', { count: bumpCommits.length })}:`,
    )
    .group()

  const displayCommits = debug
    ? bumpCommits
    : bumpCommits.slice(0, COMMIT_PREVIEW_LIMIT)
  for (const commit of displayCommits) {
    logger.info(
      `${registryPkgJson.name}@${commit.version} - ${commit.sha.slice(0, 7)}`,
    )
  }
  logger.groupEnd()
  logger.log('')

  for (const commit of bumpCommits) {
    // eslint-disable-next-line no-await-in-loop
    collect(await publishAtCommit(commit.sha, commitOptions))
  }
}

/**
 * Return the worktree to where the run found it.
 *
 * A dry run never moved off the original ref, so there is nothing to return to
 * — and discarding changes here would destroy work the preview promised to
 * leave alone.
 */
async function restoreWorktree(config: {
  dryRun: boolean
  originalBranch: string
  originalSha: string
}): Promise<void> {
  const { dryRun, originalBranch, originalSha } = config
  if (dryRun) {
    logger.log('')
    logger.log(
      `[dry-run] Staying on ${originalBranch}; the worktree was never moved or reset.`,
    )
    return
  }
  logger.log('')
  logger.log(`Returning to ${originalBranch}...`)
  // Discard any uncommitted changes from the build process.
  await spawn('git', ['reset', '--hard'])
  if (originalBranch === 'HEAD') {
    await checkoutCommit(originalSha)
  } else {
    await spawn('git', ['checkout', originalBranch])
  }
}
