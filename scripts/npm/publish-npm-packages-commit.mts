/**
 * @file The per-commit leg of the publish workflow: check out one commit,
 *   rebuild the registry, work out which packages actually moved past their
 *   published version, and stage them with the registry package last. Split out
 *   of publish-npm-packages.mts so that orchestrator stays under the file-size
 *   soft cap; the orchestrator owns commit DISCOVERY, this module owns
 *   publishing AT a commit.
 *   Every worktree mutation here — the checkout, the rebuild, the manifest
 *   refresh and its commit — is gated on a real (non-dry) run. A --dry-run
 *   previews the flow and must leave a shared checkout exactly as it found it.
 */

import path from 'node:path'

import { joinAnd } from '@socketsecurity/lib-stable/arrays/join'
import { getChangedFiles } from '@socketsecurity/lib-stable/git/changed'
import { getDefaultLogger } from '@socketsecurity/lib-stable/logger/default'
import { fetchPackageManifest } from '@socketsecurity/lib-stable/packages/manifest'
import { readPackageJsonSync } from '@socketsecurity/lib-stable/packages/read'
import { getReleaseTag } from '@socketsecurity/lib-stable/packages/specs'
import { spawn } from '@socketsecurity/lib-stable/process/spawn/child'
import { pluralize } from '@socketsecurity/lib-stable/words/pluralize'
// oxlint-disable-next-line socket/prefer-stable-external-semver -- @socketsecurity/lib-stable has no ./external/semver export at the pinned version; semver is a devDependency (scripts/tests only, not bundled).
import semver from 'semver'

import { WIN32 } from '../constants/node.mts'
import { LATEST } from '../constants/packages.mts'
import { NPM_PACKAGES_PATH, REGISTRY_PKG_PATH } from '../constants/paths.mts'
import { getNpmPackageNames } from '../constants/testing.mts'
import { checkoutCommit, getCommitSha } from './publish-npm-packages-git.mts'
import { publishPackages } from './publish-npm-packages-publish.mts'

import type { NpmManifest } from '../repo/util/manifest-types.mts'

const logger = getDefaultLogger()

const COLUMN_LIMIT = 80

export interface PackageDataInput {
  name: string
  path: string
  printName?: string | undefined
  tag?: string | undefined
}

export interface PackageData extends PackageDataInput {
  printName: string
  tag: string
}

export interface PublishAtCommitOptions {
  dryRun?: boolean | undefined
  forceRegistry?: boolean | undefined
  skipNpmPackages?: boolean | undefined
}

/**
 * Read + validate a package.json, throwing when name/version are missing.
 */
export function requirePackageJson(pkgPath: string) {
  const pkgJson = readPackageJsonSync(pkgPath)
  if (!pkgJson?.name || !pkgJson.version) {
    throw new Error(
      `Invalid package.json: missing name/version. Where: "${pkgPath}". Fix: ensure the package.json declares both "name" and "version".`,
    )
  }
  return { name: pkgJson.name, path: pkgPath, version: pkgJson.version }
}

/**
 * Create package metadata with defaults.
 */
export function packageData(data: PackageDataInput): PackageData {
  const { printName = data.name, tag = LATEST } = data
  return Object.assign(data, { printName, tag })
}

/**
 * Publish packages at a specific commit.
 */
export async function publishAtCommit(
  sha: string,
  options?: PublishAtCommitOptions | undefined,
) {
  const {
    dryRun = false,
    forceRegistry = false,
    skipNpmPackages = false,
  } = { __proto__: null, ...options } as PublishAtCommitOptions
  const headSha = await getCommitSha('HEAD')
  const isHead = sha === headSha
  logger.log('')
  logger.log(`Checking out ${isHead ? 'HEAD at ' : ''}commit ${sha}...`)
  await checkoutCommit(sha, { dryRun })

  // Rebuild at this commit to ensure we have the correct registry dist files.
  // A dry run stages nothing, so the rebuild buys nothing and its output would
  // be left behind in a worktree the preview promised not to touch.
  if (dryRun) {
    logger.log('[dry-run] Skipping the registry build.')
  } else {
    logger.log('Building registry…')
    await spawn('pnpm', ['run', 'build'], { shell: WIN32 })
  }

  const fails: string[] = []
  const skipped: string[] = []
  // Registry package comes last - publish after all other packages.
  const registryPkgJson = requirePackageJson(REGISTRY_PKG_PATH)
  const registryPackage = packageData({
    name: registryPkgJson.name,
    path: REGISTRY_PKG_PATH,
    printName: registryPkgJson.name,
  })

  const npmPackages = skipNpmPackages
    ? []
    : getNpmPackageNames().map(sockRegPkgName => {
        const pkgPath = path.join(NPM_PACKAGES_PATH, sockRegPkgName)
        const pkgJson = requirePackageJson(pkgPath)
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
    const pkg = allPackages[i]!
    const pkgJson = requirePackageJson(pkg.path)
    const localVersion = pkgJson.version

    // Force-include registry package if --force-registry flag is set. The
    // comparison derives the name from registry/package.json — a hardcoded
    // literal drifted once and silently turned this branch into dead code.
    if (forceRegistry && pkg.name === registryPackage.name) {
      packagesToPublish.push(pkg)
      logger.log(`${pkg.printName}: Force publishing (${localVersion})`)
      continue
    }

    // Fetch the latest version from npm registry.
    const manifest = (await fetchPackageManifest(
      `${pkgJson.name}@${pkg.tag}`,
    )) as NpmManifest | undefined

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
    pkg => pkg.name === registryPackage.name,
  )
  const otherPackagesToPublish = packagesToPublish.filter(
    pkg => pkg.name !== registryPackage.name,
  )

  // Publish non-registry packages first.
  if (otherPackagesToPublish.length > 0) {
    await publishPackages(
      otherPackagesToPublish,
      { fails, skipped },
      { dryRun },
    )
  }

  // Update manifest.json with latest published versions before publishing registry.
  if (registryPkgToPublish && !fails.includes(registryPkgToPublish.printName)) {
    // A dry run previews the flow; rewriting and committing manifest.json
    // would mutate a worktree the operator asked us not to touch.
    if (dryRun) {
      logger.log(
        '[dry-run] Skipping the manifest.json refresh and its commit; the worktree stays untouched.',
      )
    } else {
      await spawn('node', ['scripts/npm/update-manifest.mts', '--force'], {
        shell: WIN32,
      })
    }

    // Commit manifest changes if there are any.
    const changedFiles = dryRun ? [] : await getChangedFiles()
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
    await publishPackages(
      [registryPkgToPublish],
      { fails, skipped },
      { dryRun },
    )
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
