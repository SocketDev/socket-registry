/** @fileoverview Version comparison and validation utilities for Socket ecosystem. */

import semver from '../external/semver'

/**
 * Coerce a version string to valid semver format.
 */
export function coerceVersion(version: string): string | undefined {
  const coerced = semver.coerce(version)
  return coerced?.version
}

/**
 * Compare two semantic version strings.
 * @returns -1 if v1 < v2, 0 if v1 === v2, 1 if v1 > v2, or undefined if invalid.
 */
export function compareVersions(
  v1: string,
  v2: string,
): -1 | 0 | 1 | undefined {
  try {
    return semver.compare(v1, v2)
  } catch {
    return undefined
  }
}

/**
 * Get all versions from an array that satisfy a semver range.
 */
export function filterVersions(versions: string[], range: string): string[] {
  return versions.filter(v => semver.satisfies(v, range))
}

/**
 * Get the major version number from a version string.
 */
export function getMajorVersion(version: string): number | undefined {
  const parsed = semver.parse(version)
  return parsed?.major
}

/**
 * Get the minor version number from a version string.
 */
export function getMinorVersion(version: string): number | undefined {
  const parsed = semver.parse(version)
  return parsed?.minor
}

/**
 * Get the patch version number from a version string.
 */
export function getPatchVersion(version: string): number | undefined {
  const parsed = semver.parse(version)
  return parsed?.patch
}

/**
 * Increment a version by the specified release type.
 */
export function incrementVersion(
  version: string,
  release:
    | 'major'
    | 'minor'
    | 'patch'
    | 'premajor'
    | 'preminor'
    | 'prepatch'
    | 'prerelease',
  identifier?: string | undefined,
): string | undefined {
  return semver.inc(version, release, identifier) || undefined
}

/**
 * Check if version1 equals version2.
 */
export function isEqual(version1: string, version2: string): boolean {
  return semver.eq(version1, version2)
}

/**
 * Check if version1 is greater than version2.
 */
export function isGreaterThan(version1: string, version2: string): boolean {
  return semver.gt(version1, version2)
}

/**
 * Check if version1 is greater than or equal to version2.
 */
export function isGreaterThanOrEqual(
  version1: string,
  version2: string,
): boolean {
  return semver.gte(version1, version2)
}

/**
 * Check if version1 is less than version2.
 */
export function isLessThan(version1: string, version2: string): boolean {
  return semver.lt(version1, version2)
}

/**
 * Check if version1 is less than or equal to version2.
 */
export function isLessThanOrEqual(version1: string, version2: string): boolean {
  return semver.lte(version1, version2)
}

/**
 * Validate if a string is a valid semantic version.
 */
export function isValidVersion(version: string): boolean {
  return semver.valid(version) !== null
}

/**
 * Get the highest version from an array of versions.
 */
export function maxVersion(versions: string[]): string | undefined {
  return semver.maxSatisfying(versions, '*') || undefined
}

/**
 * Get the lowest version from an array of versions.
 */
export function minVersion(versions: string[]): string | undefined {
  return semver.minSatisfying(versions, '*') || undefined
}

/**
 * Parse a version string and return major, minor, patch components.
 */
export function parseVersion(version: string):
  | {
      major: number
      minor: number
      patch: number
      prerelease: ReadonlyArray<string | number>
      build: readonly string[]
    }
  | undefined {
  const parsed = semver.parse(version)
  if (!parsed) {
    return undefined
  }
  return {
    major: parsed.major,
    minor: parsed.minor,
    patch: parsed.patch,
    prerelease: parsed.prerelease,
    build: parsed.build,
  }
}

/**
 * Check if a version satisfies a semver range.
 */
export function satisfiesVersion(version: string, range: string): boolean {
  return semver.satisfies(version, range)
}

/**
 * Sort versions in ascending order.
 */
export function sortVersions(versions: string[]): string[] {
  return semver.sort([...versions])
}

/**
 * Sort versions in descending order.
 */
export function sortVersionsDesc(versions: string[]): string[] {
  return semver.rsort([...versions])
}

/**
 * Get the difference between two versions.
 */
export function versionDiff(
  version1: string,
  version2: string,
):
  | 'major'
  | 'premajor'
  | 'minor'
  | 'preminor'
  | 'patch'
  | 'prepatch'
  | 'prerelease'
  | undefined {
  return semver.diff(version1, version2) || undefined
}
