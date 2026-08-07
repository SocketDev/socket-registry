/**
 * @file Which packages need publishing, and under which npm dist-tag. One
 *   module answers both questions for the CI stager
 *   (publish-npm-packages-commit.mts) and the bump pass
 *   (release-npm-packages.mts), because the two disagreeing is what let nine
 *   `@socketregistry/*` packages sit at an npm `0.0.0` placeholder while both
 *   scripts reported nothing to do.
 *   The dist-tag half exists because `getReleaseTag` takes a SPEC
 *   (`name@version`) and returns the version part — handed a bare version it
 *   returns the empty string, and both call sites handed it a bare version. An
 *   empty `--tag` makes npm reject every upload with
 *   `Tag must be a non-empty string`, so the resolver here never returns one.
 */

// oxlint-disable-next-line socket/prefer-lib-versions-over-semver -- @socketsecurity/lib-stable has no ./external/semver export at the pinned version; semver is a devDependency (scripts/tests only, not bundled).
import semver from 'semver'

import { LATEST } from '../constants/packages.mts'

/**
 * The version an unclaimed npm name is reserved at. A package sitting here has
 * a published record and a resolvable `latest`, so every "is it on npm yet?"
 * check answers yes — while nothing real has ever shipped.
 */
export const PLACEHOLDER_NPM_VERSION = '0.0.0'

/**
 * Why a package does or does not need to be staged.
 */
export type NeedsPublishReason =
  | 'bumped'
  | 'current'
  | 'placeholder'
  | 'unpublished'

export interface NeedsPublishVerdict {
  needsPublish: boolean
  reason: NeedsPublishReason
  /**
   * One line naming the package and what the two sides said, printable as-is.
   */
  summary: string
}

export interface NeedsPublishInput {
  localVersion: string
  name: string
  /**
   * The version npm resolves for the package's dist-tag, or undefined when the
   * name has never been published.
   */
  remoteVersion?: string | undefined
}

/**
 * The npm dist-tag a version publishes under: `latest` for a release, and the
 * prerelease identifier for a prerelease (`1.0.0-beta.2` → `beta`). Never the
 * empty string — npm rejects an empty `--tag` outright.
 *
 * A prerelease whose identifier is numeric (`1.0.0-1`) has no name to use as a
 * tag, so it falls back to `next` rather than publishing as `latest`.
 */
export function resolveDistTag(version: string): string {
  const parts = semver.valid(version) ? semver.prerelease(version) : undefined
  if (!parts?.length) {
    return LATEST
  }
  const first = parts[0]
  return typeof first === 'string' && first ? first : 'next'
}

/**
 * Whether an npm-resolved version is the unclaimed-name placeholder.
 */
export function isPlaceholderNpmVersion(version: string | undefined): boolean {
  return version === PLACEHOLDER_NPM_VERSION
}

/**
 * Whether a package needs to be staged, and why.
 *
 * The placeholder case is called out separately from a plain version bump so
 * the caller can print it LOUDLY: a `0.0.0` → `1.0.0` move is a package
 * shipping for the first time, which is exactly the state that went unnoticed.
 */
export function resolveNeedsPublish(
  input: NeedsPublishInput,
): NeedsPublishVerdict {
  const { localVersion, name, remoteVersion } = input
  if (!remoteVersion) {
    return {
      needsPublish: true,
      reason: 'unpublished',
      summary: `${name}: never published → ${localVersion}`,
    }
  }
  if (isPlaceholderNpmVersion(remoteVersion)) {
    return {
      needsPublish: !isPlaceholderNpmVersion(localVersion),
      reason: 'placeholder',
      summary: isPlaceholderNpmVersion(localVersion)
        ? `${name}: still a ${PLACEHOLDER_NPM_VERSION} placeholder locally and on npm`
        : `${name}: npm holds the ${PLACEHOLDER_NPM_VERSION} placeholder → ${localVersion} (first real publish)`,
    }
  }
  if (semver.valid(localVersion) && semver.gt(localVersion, remoteVersion)) {
    return {
      needsPublish: true,
      reason: 'bumped',
      summary: `${name}: ${remoteVersion} → ${localVersion}`,
    }
  }
  return {
    needsPublish: false,
    reason: 'current',
    summary: `${name}: npm already has ${remoteVersion}`,
  }
}

/**
 * Parse the workflow's `only` input into a filter set. Comma or whitespace
 * separated; an empty input means "no filter".
 */
export function parseOnlyFilter(only: string | undefined): Set<string> {
  const entries = (only ?? '')
    .split(/[\s,]+/)
    .map(entry => entry.trim())
    .filter(Boolean)
  return new Set(entries)
}

/**
 * Whether a package passes the `only` filter. A package matches on its full
 * npm name (`@socketregistry/is-data-view`) or on its unscoped directory name
 * (`is-data-view`), so an operator can paste either form.
 */
export function matchesOnlyFilter(
  filter: Set<string>,
  name: string,
  printName?: string | undefined,
): boolean {
  if (!filter.size) {
    return true
  }
  const unscoped = name.includes('/') ? name.slice(name.indexOf('/') + 1) : name
  return (
    filter.has(name) ||
    filter.has(unscoped) ||
    (!!printName && filter.has(printName))
  )
}
