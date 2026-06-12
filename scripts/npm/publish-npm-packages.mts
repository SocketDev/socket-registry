/**
 * @file Publish npm packages with version bump detection and retry logic.
 */

import path from 'node:path'

import { parseArgs } from '@socketsecurity/lib-stable/argv/parse'

import { joinAnd } from '@socketsecurity/lib-stable/arrays/join'
import { getChangedFiles } from '@socketsecurity/lib-stable/git/changed'
import { getDefaultLogger } from '@socketsecurity/lib-stable/logger/default'
import { readPackageJsonSync } from '@socketsecurity/lib-stable/packages/read'
import { getReleaseTag } from '@socketsecurity/lib-stable/packages/specs'
import { spawn } from '@socketsecurity/lib-stable/process/spawn/child'
import { pluralize } from '@socketsecurity/lib-stable/words/pluralize'
// oxlint-disable-next-line socket/prefer-stable-external-semver -- @socketsecurity/lib-stable has no ./external/semver export at the pinned version; semver is a devDependency (scripts/tests only, not bundled).
import semver from 'semver'

import { getEnv } from '../constants/env.mts'
import { WIN32 } from '../constants/node.mts'
import { LATEST } from '../constants/packages.mts'
import { NPM_PACKAGES_PATH, REGISTRY_PKG_PATH } from '../constants/paths.mts'
import { getNpmPackageNames } from '../constants/testing.mts'
import process from 'node:process'
import { fetchPackageManifest } from '@socketsecurity/lib-stable/packages/manifest'
import {
  checkoutCommit,
  ensureNpmVersion,
  findVersionBumpCommits,
  getCommitSha,
  getCurrentBranch,
} from './publish-npm-packages-git.mts'
import { publishPackages } from './publish-npm-packages-publish.mts'

const logger = getDefaultLogger()

const COLUMN_LIMIT = 80

const ENV = getEnv()

const { values: cliArgs } = parseArgs({
  options: {
    debug: {
      type: 'boolean',
    },
    force: {
      type: 'boolean',
      short: 'f',
    },
    'force-publish': {
      type: 'boolean',
    },
    'force-registry': {
      type: 'boolean',
    },
    'skip-npm-packages': {
      type: 'boolean',
    },
    quiet: {
      type: 'boolean',
    },
  },
  strict: false,
})

// Debug: Always log force flags status to diagnose workflow issues.
logger.log('DEBUG: process.argv:', process.argv.slice(2).join(' '))
logger.log('DEBUG: Full cliArgs:', JSON.stringify(cliArgs, null, 2))
logger.log('DEBUG: cliArgs.forcePublish =', cliArgs.forcePublish)
logger.log('DEBUG: cliArgs["force-publish"] =', cliArgs['force-publish'])
logger.log('DEBUG: cliArgs.forceRegistry =', cliArgs.forceRegistry)
logger.log('DEBUG: cliArgs["force-registry"] =', cliArgs['force-registry'])
logger.log('DEBUG: cliArgs.skipNpmPackages =', cliArgs.skipNpmPackages)
logger.log(
  'DEBUG: cliArgs["skip-npm-packages"] =',
  cliArgs['skip-npm-packages'],
)

/**
 * Create package metadata with defaults.
 */
export function packageData(data) {
  const { printName = data.name, tag = LATEST } = data
  return Object.assign(data, { printName, tag })
}

/**
 * Publish packages at a specific commit.
 */
export async function publishAtCommit(sha) {
  const headSha = await getCommitSha('HEAD')
  const isHead = sha === headSha
  logger.log('')
  logger.log(`Checking out ${isHead ? 'HEAD at ' : ''}commit ${sha}...`)
  await checkoutCommit(sha)

  // Rebuild at this commit to ensure we have the correct registry dist files.
  logger.log('Building registry…')
  await spawn('pnpm', ['run', 'build'], { shell: WIN32 })

  const fails = []
  const skipped = []
  // Registry package comes last - publish after all other packages.
  const registryPkgJson = readPackageJsonSync(REGISTRY_PKG_PATH)
  const registryPackage = packageData({
    name: registryPkgJson.name,
    path: REGISTRY_PKG_PATH,
    printName: registryPkgJson.name,
  })

  // Check if we should skip npm override packages.
  const skipNpmPackagesFlag =
    cliArgs.skipNpmPackages ||
    cliArgs['skip-npm-packages'] ||
    cliArgs['--']?.includes('--skip-npm-packages')

  const npmPackages = skipNpmPackagesFlag
    ? []
    : getNpmPackageNames().map(sockRegPkgName => {
        const pkgPath = path.join(NPM_PACKAGES_PATH, sockRegPkgName)
        const pkgJson = readPackageJsonSync(pkgPath)
        return packageData({
          name: pkgJson.name,
          path: pkgPath,
          printName: pkgJson.name,
          tag: getReleaseTag(pkgJson.version),
        })
      })

  const allPackages = [...npmPackages, registryPackage]

  // Filter packages to only publish those with bumped versions.
  const packagesToPublish = []

  for (let i = 0, { length } = allPackages; i < length; i += 1) {
    const pkg = allPackages[i]
    const pkgJson = readPackageJsonSync(pkg.path)
    const localVersion = pkgJson.version

    // Force-include registry package if --force-registry flag is set.
    const isRegistryPkg = pkg.printName === '@socketsecurity/registry-stable'
    const forceRegistryFlag =
      cliArgs.forceRegistry ||
      cliArgs['force-registry'] ||
      cliArgs['--']?.includes('--force-registry')

    if (isRegistryPkg && forceRegistryFlag) {
      packagesToPublish.push(pkg)
      logger.log(`${pkg.printName}: Force publishing (${localVersion})`)
      continue
    }

    // Fetch the latest version from npm registry.

    const manifest = await fetchPackageManifest(`${pkgJson.name}@${pkg.tag}`)

    if (!manifest) {
      // Package doesn't exist on npm yet, publish it.
      packagesToPublish.push(pkg)
      logger.log(`${pkg.printName}: New package (${localVersion})`)
      continue
    }

    const remoteVersion = manifest.version

    // Compare versions - only publish if local is greater than remote.
    if (semver.gt(localVersion, remoteVersion)) {
      packagesToPublish.push(pkg)
      logger.log(`${pkg.printName}: ${remoteVersion} → ${localVersion}`)
    } else {
      skipped.push(pkg.printName)
    }
  }

  if (!packagesToPublish.length) {
    logger.log('No packages to publish at this commit')
    return { fails, skipped }
  }

  logger.log('')
  logger.log(
    `Publishing ${packagesToPublish.length} ${pluralize('package', { count: packagesToPublish.length })}...`,
  )
  logger.log('')

  // Separate registry package from other packages.
  const registryPkgToPublish = packagesToPublish.find(
    pkg => pkg.printName === '@socketsecurity/registry-stable',
  )
  const otherPackagesToPublish = packagesToPublish.filter(
    pkg => pkg.printName !== '@socketsecurity/registry-stable',
  )

  // Publish non-registry packages first.
  if (otherPackagesToPublish.length > 0) {
    await publishPackages(otherPackagesToPublish, { fails, skipped })
  }

  // Update manifest.json with latest published versions before publishing registry.
  if (registryPkgToPublish && !fails.includes(registryPkgToPublish.printName)) {
    await spawn('node', ['scripts/npm/update-manifest.mts', '--force'], {
      shell: WIN32,
    })

    // Commit manifest changes if there are any.
    const changedFiles = await getChangedFiles()
    const manifestPath = 'registry/manifest.json'
    const manifestChanged = changedFiles.includes(manifestPath)

    if (manifestChanged) {
      logger.log('')
      logger.log(
        'Updating and committing manifest.json with latest npm versions…',
      )
      await spawn('git', ['config', 'user.name', 'Socket Bot'])
      await spawn('git', [
        'config',
        'user.email',
        '94589996+socket-bot@users.noreply.github.com',
      ])
      await spawn('git', ['add', manifestPath])
      await spawn('git', [
        'commit',
        '-m',
        'Update manifest.json with latest npm versions',
      ])
    }

    // Publish registry package last.
    await publishPackages([registryPkgToPublish], { fails, skipped })
  }

  if (fails.length) {
    const msg = `Unable to publish ${fails.length} ${pluralize('package', { count: fails.length })}:`
    const msgList = joinAnd(fails)
    const separator = msg.length + msgList.length > COLUMN_LIMIT ? '\n' : ' '
    logger.warn(`${msg}${separator}${msgList}`)
  }

  if (skipped.length) {
    logger.log(
      `Skipped ${skipped.length} ${pluralize('package', { count: skipped.length })}`,
    )
  }

  return { fails, skipped }
}

/**
 * Find unpublished version bumps and publish them in chronological order.
 */
async function main(): Promise<void> {
  // Ensure npm version is >= 11.5.1 for trusted publishing FIRST.
  // This must happen before any other operations.
  await ensureNpmVersion()

  // Exit early if not running in CI or with --force.
  if (!(cliArgs.force || ENV.CI)) {
    return
  }

  const originalBranch = await getCurrentBranch()
  const originalSha = await getCommitSha('HEAD')

  try {
    // If --force-publish is set, skip commit detection and publish at HEAD.
    // Check both the parsed option and the -- array (for cases like: node script -- --force-publish).
    const forcePublishFlag =
      cliArgs.forcePublish || cliArgs['--']?.includes('--force-publish')
    if (forcePublishFlag) {
      logger.log('Running with --force-publish')
      logger.log('Force publish mode: skipping commit detection')
      const headSha = await getCommitSha('HEAD')
      await publishAtCommit(headSha)
      return
    }

    // Log if --force-registry is set.
    const forceRegistryFlag =
      cliArgs.forceRegistry ||
      cliArgs['force-registry'] ||
      cliArgs['--']?.includes('--force-registry')
    if (forceRegistryFlag) {
      logger.log('Running with --force-registry')
      logger.log(
        'Registry package will be force-published regardless of version changes',
      )
    }

    // Log if --skip-npm-packages is set.
    const skipNpmPackagesFlag =
      cliArgs.skipNpmPackages ||
      cliArgs['skip-npm-packages'] ||
      cliArgs['--']?.includes('--skip-npm-packages')
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
        await publishAtCommit(headSha)
      }
      return
    }

    // Sort by version descending (highest to lowest).
    bumpCommits.sort((a, b) => semver.compare(b.version, a.version))

    // Check the registry package for the latest published version.
    const registryPkgJson = readPackageJsonSync(REGISTRY_PKG_PATH)
    const registryManifest = await fetchPackageManifest(
      `${registryPkgJson.name}@latest`,
    )

    if (registryManifest) {
      const publishedVersion = registryManifest.version
      logger.info(
        `Latest published: ${registryPkgJson.name}@${publishedVersion}`,
      )

      // Filter to only commits with versions newer than published version.
      const newerCommits = []
      for (let i = 0, { length } = bumpCommits; i < length; i += 1) {
        const commit = bumpCommits[i]
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
      await publishAtCommit(headSha)
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
      const commit = displayCommits[i]
      logger.info(
        `@socketsecurity/registry-stable@${commit.version} - ${commit.sha.slice(0, 7)}`,
      )
    }
    logger.groupEnd()
    logger.log('')

    for (let i = 0, { length } = bumpCommits; i < length; i += 1) {
      const commit = bumpCommits[i]
      await publishAtCommit(commit.sha)
    }

    logger.log('')
    logger.success('All versions published successfully')
  } finally {
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
}

main().catch((e: unknown) => {
  logger.error(e)
  process.exitCode = 1
})
