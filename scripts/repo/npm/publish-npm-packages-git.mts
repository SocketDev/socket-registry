/**
 * @file Git and npm-version discovery helpers for the publish workflow:
 *   checking out a commit (a no-op under --dry-run, and a refusal rather than
 *   a `git reset --hard` over a dirty local worktree), ensuring npm meets the
 *   trusted-publishing version floor, finding registry version-bump commits,
 *   and reading branch/SHA refs.
 *   Split out of publish-npm-packages.mts so that orchestrator stays under the
 *   file-size soft cap.
 */

import { getDefaultLogger } from '@socketsecurity/lib-stable/logger/default'
import { spawn } from '@socketsecurity/lib-stable/process/spawn/child'
// oxlint-disable-next-line socket/prefer-stable-external-semver -- @socketsecurity/lib-stable has no ./external/semver export at the pinned version; semver is a devDependency (scripts/tests only, not bundled).
import semver from 'semver'

import { getEnv } from '../constants/env.mts'
import { WIN32 } from '../constants/node.mts'

const logger = getDefaultLogger()

export interface CheckoutCommitOptions {
  dryRun?: boolean | undefined
}

/**
 * Check out a specific commit for the publish flow.
 *
 * A dry run previews the flow, so it leaves the worktree exactly as it found
 * it — no reset, no checkout. A real run discards the previous iteration's
 * build output before moving, which is safe on CI's disposable checkout but
 * would destroy a parallel session's uncommitted work in a shared local one;
 * a dirty local worktree therefore refuses instead of being blown away.
 */
export async function checkoutCommit(
  sha: string,
  options?: CheckoutCommitOptions | undefined,
): Promise<void> {
  const { dryRun = false } = {
    __proto__: null,
    ...options,
  } as CheckoutCommitOptions
  if (dryRun) {
    logger.log(
      `[dry-run] Leaving the worktree untouched; a real run would reset and check out ${sha}.`,
    )
    return
  }
  const status = await spawn('git', ['status', '--porcelain'])
  const dirty = status.stdout.trim()
  if (dirty && !getEnv().CI) {
    throw new Error(
      `Refusing to reset a dirty worktree for the publish checkout.\n` +
        `  Where: this checkout, moving to ${sha}.\n` +
        `  Saw vs wanted: ${dirty.split('\n').length} uncommitted change(s); wanted a clean worktree, because the checkout starts with \`git reset --hard\` and would discard them permanently (fleet checkouts are shared with parallel sessions).\n` +
        `  Fix: commit or move the changes, then re-run — or pass --dry-run to preview the publish flow without touching the worktree.`,
    )
  }
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
    if (!line) {
      continue
    }
    // Parse a `<hex-hash> <name>` line: (1) the leading hex digest, (2) the rest.
    const match = /^([a-f0-9]+) (.+)$/.exec(line)
    if (!match) {
      continue
    }

    const sha = match[1]
    const message = match[2]
    if (!sha || !message) {
      continue
    }

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
export async function getCommitSha(ref: string) {
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
