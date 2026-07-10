/**
 * @file Git and npm-version discovery helpers for the publish workflow:
 *   checking out a commit, ensuring npm meets the trusted-publishing version
 *   floor, finding registry version-bump commits, and reading branch/SHA refs.
 *   Split out of publish-npm-packages.mts so that orchestrator stays under the
 *   file-size soft cap.
 */

import { getDefaultLogger } from '@socketsecurity/lib-stable/logger/default'
import { spawn } from '@socketsecurity/lib-stable/process/spawn/child'
// oxlint-disable-next-line socket/prefer-stable-external-semver -- @socketsecurity/lib-stable has no ./external/semver export at the pinned version; semver is a devDependency (scripts/tests only, not bundled).
import semver from 'semver'

import { WIN32 } from '../constants/node.mts'

const logger = getDefaultLogger()

/**
 * Checkout a specific commit and discard uncommitted changes.
 */
export async function checkoutCommit(sha) {
  // Discard any uncommitted changes from previous builds.
  await spawn('git', ['reset', '--hard'])
  await spawn('git', ['checkout', sha])
}

/**
 * Ensure npm version meets requirements for trusted publishing.
 */
export async function ensureNpmVersion() {
  // Check current npm version first.
  const currentVersionResult = await spawn('npm', ['--version'], {
    shell: WIN32,
  })
  const currentVersion = currentVersionResult.stdout.trim()

  // Check if current version meets requirements (>= 11.5.1).
  const meetsRequirement = semver.gte(currentVersion, '11.5.1')

  if (meetsRequirement) {
    logger.info(`npm version: ${currentVersion}`)
  } else {
    // Install npm@latest if current version is insufficient.
    logger.log(
      `npm version ${currentVersion} does not meet 11.5.1+ requirement, installing npm@latest…`,
    )
    await spawn('npm', ['install', '-g', 'npm@latest'], { shell: WIN32 })
    const result = await spawn('npm', ['--version'], { shell: WIN32 })
    const npmVersion = result.stdout.trim()
    logger.info(`npm version: ${npmVersion}`)

    // Verify the new version meets requirements.
    if (!semver.gte(npmVersion, '11.5.1')) {
      throw new Error(
        `npm version ${npmVersion} does not meet the 11.5.1+ requirement for trusted publishing`,
      )
    }
  }
}

/**
 * Find all commits with version bumps in the registry package.
 */
export async function findVersionBumpCommits() {
  // Get git log with commit messages for version bumps.
  // Matches both old style "Bump..." and new conventional commit style "chore(registry): bump...".
  const result = await spawn('git', [
    'log',
    '-E',
    '--grep=^Bump|^chore\\(registry\\): bump',
    '--format=%H %s',
    'main',
  ])

  const commits = []
  const lines = result.stdout.trim().split('\n')

  for (let i = 0, { length } = lines; i < length; i += 1) {
    const line = lines[i]
    // Parse a `<hex-hash> <name>` line: (1) the leading hex digest, (2) the rest.
    const match = /^([a-f0-9]+) (.+)$/.exec(line)
    if (!match) {
      continue
    }

    const sha = match[1]
    const message = match[2]

    // Skip non-package bump commits (like dependency bumps).
    // Accept specific version bump patterns:
    // Old style:
    // - "Bump to v<version>" (general format)
    // - "Bump <pkgname> to v<version>"
    // - "Bump registry package to v<version>"
    // New conventional commit style:
    // - "chore(registry): bump version to <version>"
    // Exclude generic "Update" or "Bump" messages without version info.
    if (
      !/^Bump (?:.+? )?to v/.test(message) &&
      !/^chore\(registry\): bump version to \d+\.\d+\.\d+/.test(message)
    ) {
      continue
    }

    // Get the registry package.json version at this commit.
    try {
      const pkgJsonResult = await spawn('git', [
        'show',
        `${sha}:registry/package.json`,
      ])
      const pkgJson = JSON.parse(pkgJsonResult.stdout)
      commits.push({
        sha,
        version: pkgJson.version,
        message,
      })
    } catch {
      // Skip commits where registry/package.json doesn't exist or can't be parsed.
    }
  }

  // Reverse to get chronological order (oldest first).
  return commits.slice().toReversed()
}

/**
 * Get the full commit SHA for a given ref.
 */
export async function getCommitSha(ref) {
  const result = await spawn('git', ['rev-parse', ref])
  return result.stdout.trim()
}

/**
 * Get the name of the current git branch.
 */
export async function getCurrentBranch() {
  const result = await spawn('git', ['rev-parse', '--abbrev-ref', 'HEAD'])
  return result.stdout.trim()
}
