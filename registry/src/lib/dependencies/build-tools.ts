/** @fileoverview Build and utility tool dependency registry. */

export interface FastSort {
  createNewSortInstance(options: {
    comparer: (a: string, b: string) => number
  }): <T>(arr: T[]) => {
    asc(prop?: ((item: T) => unknown) | keyof T): T[]
    by(sorts: Array<{ asc?: string; desc?: string }>): T[]
    desc(prop?: ((item: T) => unknown) | keyof T): T[]
  }
  sort<T>(arr: T[]): {
    asc(prop?: ((item: T) => unknown) | keyof T): T[]
    by(sorts: Array<{ asc?: string; desc?: string }>): T[]
    desc(prop?: ((item: T) => unknown) | keyof T): T[]
  }
}

export interface Semver {
  clean(version: string): string | null
  coerce(version: string): { version: string } | null
  compare(v1: string, v2: string): number
  gte(v1: string, v2: string): boolean
  intersects(r1: string, r2: string): boolean
  lte(v1: string, v2: string): boolean
  maxSatisfying(versions: string[], range: string): string | null
  minVersion(range: string): { version: string } | null
  parse(version: string): unknown
  satisfies(version: string, range: string): boolean
  valid(version: string): string | null
}

interface BuildToolsDependencies {
  fastSort: FastSort | undefined
  semver: Semver | undefined
}

const dependencies: BuildToolsDependencies = {
  fastSort: undefined,
  semver: undefined,
}

/**
 * Get fast-sort instance, lazily loading if not set.
 */
export function getFastSort(): FastSort {
  if (!dependencies.fastSort) {
    dependencies.fastSort = require('../../external/fast-sort')
  }
  return dependencies.fastSort!
}

/**
 * Get semver instance, lazily loading if not set.
 */
export function getSemver(): Semver {
  if (!dependencies.semver) {
    dependencies.semver = require('../../external/semver')
  }
  return dependencies.semver!
}

/**
 * Set fast-sort instance (useful for testing).
 */
export function setFastSort(fastSort: FastSort): void {
  dependencies.fastSort = fastSort
}

/**
 * Set semver instance (useful for testing).
 */
export function setSemver(semver: Semver): void {
  dependencies.semver = semver
}

/**
 * Reset all build tool dependencies to undefined (forces reload on next access).
 */
export function resetBuildToolsDependencies(): void {
  dependencies.fastSort = undefined
  dependencies.semver = undefined
}
