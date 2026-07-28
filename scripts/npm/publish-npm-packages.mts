/**
 * @file Publish npm packages: find the registry's unpublished version-bump
 *   commits and hand each one to the per-commit publish leg
 *   (publish-npm-packages-commit.mts) in chronological order, then run the
 *   batched approve pass. Outside CI, and without --force, the flow refuses
 *   LOUD rather than exiting 0 having done nothing.
 */

import process from 'node:process'

import { getDefaultLogger } from '@socketsecurity/lib-stable/logger/default'
import { fetchPackageManifest } from '@socketsecurity/lib-stable/packages/manifest'
import { spawn } from '@socketsecurity/lib-stable/process/spawn/child'
import { pluralize } from '@socketsecurity/lib-stable/words/pluralize'
// oxlint-disable-next-line socket/prefer-stable-external-semver -- @socketsecurity/lib-stable has no ./external/semver export at the pinned version; semver is a devDependency (scripts/tests only, not bundled).
import semver from 'semver'

import { getEnv } from '../constants/env.mts'
import { REGISTRY_PKG_PATH } from '../constants/paths.mts'
import { isMainModule } from '../fleet/_shared/is-main-module.mts'
import { cliArgs, dryRunFlag, otpFlag } from './publish-npm-packages-args.mts'
import {
  publishAtCommit,
  requirePackageJson,
} from './publish-npm-packages-commit.mts'
import {
  checkoutCommit,
  ensureNpmVersion,
  findVersionBumpCommits,
  getCommitSha,
  getCurrentBranch,
} from './publish-npm-packages-git.mts'
import { approveStagedPackages } from './publish-npm-packages-publish.mts'

import type { NpmManifest } from '../repo/util/manifest-types.mts'

const logger = getDefaultLogger()

const ENV = getEnv()

/**
 * Find unpublished version bumps and publish them in chronological order.
 */
export async function main(): Promise<void> {
  // Refuse LOUD outside CI: exiting 0 here reads as "published successfully"
  // to every caller that only checks the exit code. This runs before
  // ensureNpmVersion so a refused run never installs a global npm.
  if (!(cliArgs.force || ENV.CI)) {
    throw new Error(
      `Refusing to run the npm publish flow.\n` +
        `  Where: scripts/npm/publish-npm-packages.mts, invoked outside CI.\n` +
        `  Saw vs wanted: neither the CI environment nor --force; wanted a CI run, where the trusted-publishing identity and the automation token live.\n` +
        `  Fix: dispatch the publish workflow from CI, or re-run locally with --force — add --dry-run to preview the flow without staging anything or touching the worktree.`,
    )
  }

  // Ensure npm version is >= 11.5.1 for trusted publishing before any
  // publish-side operation.
  await ensureNpmVersion()

  const originalBranch = await getCurrentBranch()
  const originalSha = await getCommitSha('HEAD')

  // Each flag is accepted both as a parsed option and inside the `--` array
  // (for cases like: node script -- --force-publish).
  const forcePublishFlag = !!(
    cliArgs.forcePublish || cliArgs['--']?.includes('--force-publish')
  )
  const forceRegistryFlag = !!(
    cliArgs.forceRegistry ||
    cliArgs['force-registry'] ||
    cliArgs['--']?.includes('--force-registry')
  )
  const skipNpmPackagesFlag = !!(
    cliArgs.skipNpmPackages ||
    cliArgs['skip-npm-packages'] ||
    cliArgs['--']?.includes('--skip-npm-packages')
  )
  const commitOptions = {
    dryRun: dryRunFlag,
    forceRegistry: forceRegistryFlag,
    skipNpmPackages: skipNpmPackagesFlag,
  }

  try {
    // If --force-publish is set, skip commit detection and publish at HEAD.
    if (forcePublishFlag) {
      logger.log('Running with --force-publish')
      logger.log('Force publish mode: skipping commit detection')
      const headSha = await getCommitSha('HEAD')
      await publishAtCommit(headSha, commitOptions)
      return
    }

    if (forceRegistryFlag) {
      logger.log('Running with --force-registry')
      logger.log(
        'Registry package will be force-published regardless of version changes',
      )
    }

    if (skipNpmPackagesFlag) {
      logger.log('Running with --skip-npm-packages')
      logger.log('NPM override packages (packages/*) will be skipped')
    }

    // Find all version bump commits.
    const bumpCommits = await findVersionBumpCommits()

    if (!bumpCommits.length) {
      logger.info('No version bump commits found')
      // If --force-registry is set, still try to publish at HEAD.
      if (forceRegistryFlag) {
        logger.log('')
        logger.log(
          'Force-registry flag is set, checking HEAD for unpublished packages…',
        )
        const headSha = await getCommitSha('HEAD')
        await publishAtCommit(headSha, commitOptions)
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
      logger.info(
        `Latest published: ${registryPkgJson.name}@${publishedVersion}`,
      )

      // Filter to only commits with versions newer than published version.
      const newerCommits = []
      for (let i = 0, { length } = bumpCommits; i < length; i += 1) {
        const commit = bumpCommits[i]!
        if (semver.gt(commit.version, publishedVersion)) {
          newerCommits.push(commit)
        }
      }

      // Update bumpCommits to only include newer versions
      bumpCommits.length = 0
      bumpCommits.push(...newerCommits)
    } else {
      logger.info(
        `Latest published: ${registryPkgJson.name}@<not yet published>`,
      )
    }

    if (!bumpCommits.length) {
      logger.info('No registry version bumps to publish')
      logger.log('')
      logger.log('Checking for unpublished packages at HEAD…')
      // Even if there are no registry version bumps, we should check
      // if any @socketregistry/* packages have unpublished versions.
      const headSha = await getCommitSha('HEAD')
      await publishAtCommit(headSha, commitOptions)
      return
    }

    logger.log('')
    logger
      .log(
        `Publishing ${bumpCommits.length} unpublished version ${pluralize('bump', { count: bumpCommits.length })}:`,
      )
      .group()

    const displayCommits = cliArgs.debug
      ? bumpCommits
      : bumpCommits.slice(0, 10)

    for (let i = 0, { length } = displayCommits; i < length; i += 1) {
      const commit = displayCommits[i]!
      logger.info(
        `${registryPkgJson.name}@${commit.version} - ${commit.sha.slice(0, 7)}`,
      )
    }
    logger.groupEnd()
    logger.log('')

    for (let i = 0, { length } = bumpCommits; i < length; i += 1) {
      const commit = bumpCommits[i]!
      await publishAtCommit(commit.sha, commitOptions)
    }

    logger.log('')
    logger.success('All versions published successfully')
  } finally {
    // A dry run never moved off the original ref, so there is nothing to
    // return to — and discarding changes here would destroy work the preview
    // promised to leave alone.
    if (dryRunFlag) {
      logger.log('')
      logger.log(
        `[dry-run] Staying on ${originalBranch}; the worktree was never moved or reset.`,
      )
    } else {
      // Always return to the original branch/commit.
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

    // Approve is a separate step from staging: this monorepo stages hundreds
    // of packages per wave (across all the commits published above), then
    // promotes them here in one batched approve pass under a shared,
    // periodically-refreshed OTP. Runs in `finally` so every early-return
    // branch above (force-publish, no-bump-commits, force-registry, …)
    // still gets its staged packages approved.
    const approveState = { fails: [] }
    await approveStagedPackages(approveState, {
      dryRun: dryRunFlag,
      otp: otpFlag,
    })
    if (approveState.fails.length) {
      process.exitCode = 1
    }
  }
}

if (isMainModule(import.meta.url)) {
  main().catch((e: unknown) => {
    logger.error(e)
    process.exitCode = 1
  })
}
