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
import { spawn } from '@socketsecurity/lib-stable/process/spawn/child'
import { pluralize } from '@socketsecurity/lib-stable/words/pluralize'

import { WIN32 } from '../constants/node.mts'
import { LATEST } from '../constants/packages.mts'
import { NPM_PACKAGES_PATH, REGISTRY_PKG_PATH } from '../constants/paths.mts'
import { getNpmPackageNames } from '../constants/testing.mts'
import { checkoutCommit, getCommitSha } from './publish-npm-packages-git.mts'
import type {
  PublishFailure,
  PublishState,
} from './publish-npm-packages-failures.mts'
import {
  matchesOnlyFilter,
  parseOnlyFilter,
  resolveDistTag,
  resolveNeedsPublish,
} from './publish-npm-packages-needs.mts'
import { publishPackages } from './publish-npm-packages-publish.mts'

import type { NpmManifest } from '../util/manifest-types.mts'

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
  /**
   * The dist-tag every release-versioned package stages under. A prerelease
   * version still resolves its own identifier — `1.0.0-beta.2` stages under
   * `beta` no matter what this says.
   */
  distTag?: string | undefined
  dryRun?: boolean | undefined
  forceRegistry?: boolean | undefined
  /**
   * Comma-separated package filter, matched against the full npm name or the
   * unscoped directory name. Empty stages every needs-publish package.
   */
  only?: string | undefined
  skipNpmPackages?: boolean | undefined
}

export interface PublishAtCommitResult {
  fails: string[]
  failures: PublishFailure[]
  skipped: string[]
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
): Promise<PublishAtCommitResult> {
  const {
    distTag = LATEST,
    dryRun = false,
    forceRegistry = false,
    only,
    skipNpmPackages = false,
  } = { __proto__: null, ...options } as PublishAtCommitOptions
  const onlyFilter = parseOnlyFilter(only)
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
  const failures: PublishFailure[] = []
  const skipped: string[] = []
  // Registry package comes last - publish after all other packages.
  const registryPkgJson = requirePackageJson(REGISTRY_PKG_PATH)
  const registryPackage = packageData({
    name: registryPkgJson.name,
    path: REGISTRY_PKG_PATH,
    printName: registryPkgJson.name,
    // The registry package publishes under the dispatched dist-tag unless its
    // own version names a prerelease identifier.
    tag:
      resolveDistTag(registryPkgJson.version) === LATEST
        ? distTag
        : resolveDistTag(registryPkgJson.version),
  })

  const npmPackages = skipNpmPackages
    ? []
    : getNpmPackageNames().map(sockRegPkgName => {
        const pkgPath = path.join(NPM_PACKAGES_PATH, sockRegPkgName)
        const pkgJson = requirePackageJson(pkgPath)
        const resolved = resolveDistTag(pkgJson.version)
        return packageData({
          name: pkgJson.name,
          path: pkgPath,
          printName: pkgJson.name,
          tag: resolved === LATEST ? distTag : resolved,
        })
      })

  const allPackages = [...npmPackages, registryPackage].filter(pkg =>
    matchesOnlyFilter(onlyFilter, pkg.name, pkg.printName),
  )
  if (onlyFilter.size) {
    logger.log(
      `Filtered to ${allPackages.length} ${pluralize('package', { count: allPackages.length })} by --only ${only}`,
    )
  }

  // Filter packages to only publish those with bumped versions.
  const packagesToPublish = []
  // A package npm still holds at the 0.0.0 name-reservation placeholder is
  // shipping for the FIRST time. It is listed on its own line at the end: nine
  // of them once sat unnoticed because every "is it on npm?" check answered
  // yes and every version comparison was made against an empty dist-tag.
  const firstPublishes: string[] = []

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

    // Fetch the version npm resolves for this package's dist-tag.
    const manifest = (await fetchPackageManifest(
      `${pkgJson.name}@${pkg.tag}`,
    )) as NpmManifest | undefined

    const verdict = resolveNeedsPublish({
      localVersion,
      name: pkg.printName,
      remoteVersion: manifest?.version,
    })
    if (verdict.needsPublish) {
      packagesToPublish.push(pkg)
      logger.log(verdict.summary)
      if (verdict.reason === 'placeholder') {
        firstPublishes.push(pkg.printName)
      }
    } else {
      skipped.push(pkg.printName)
    }
  }

  if (firstPublishes.length) {
    logger.log('')
    logger.warn(
      `${firstPublishes.length} ${pluralize('package', { count: firstPublishes.length })} still hold the 0.0.0 placeholder on npm and publish for the first time here: ${joinAnd(firstPublishes)}`,
    )
  }

  if (!packagesToPublish.length) {
    logger.log('No packages to publish at this commit')
    return { fails, failures, skipped }
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

  // ONE state object for the whole commit: a fresh `{ fails, skipped }` per
  // call would drop the per-package failure detail recorded into it.
  const state: PublishState = { fails, failures, skipped }

  // Publish non-registry packages first.
  if (otherPackagesToPublish.length > 0) {
    await publishPackages(otherPackagesToPublish, state, { dryRun })
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
      await spawn('node', ['scripts/repo/npm/update-manifest.mts', '--force'], {
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
    await publishPackages([registryPkgToPublish], state, { dryRun })
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

  return { fails, failures, skipped }
}
