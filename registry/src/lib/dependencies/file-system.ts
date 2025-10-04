/** @fileoverview File system dependency registry. */

export type Cacache = typeof import('cacache')

export type FastGlob = typeof import('fast-glob')

export type Picomatch = typeof import('picomatch')

export type Del = {
  deleteAsync: (
    patterns: string | string[],
    options?: unknown,
  ) => Promise<string[]>
  deleteSync: (patterns: string | string[], options?: unknown) => string[]
}

interface FileSystemDependencies {
  cacache: Cacache | undefined
  del: Del | undefined
  fastGlob: FastGlob | undefined
  picomatch: Picomatch | undefined
}

const dependencies: FileSystemDependencies = {
  cacache: undefined,
  del: undefined,
  fastGlob: undefined,
  picomatch: undefined,
}

/**
 * Get cacache instance, lazily loading if not set.
 */
export function getCacache(): Cacache {
  if (!dependencies.cacache) {
    dependencies.cacache = require('../../external/cacache')
  }
  return dependencies.cacache!
}

/**
 * Get del instance, lazily loading if not set.
 */
export function getDel(): Del {
  if (!dependencies.del) {
    dependencies.del = require('../../external/del')
  }
  return dependencies.del!
}

/**
 * Get fast-glob instance, lazily loading if not set.
 */
export function getFastGlob(): FastGlob {
  if (!dependencies.fastGlob) {
    const globExport = require('../../external/fast-glob')
    dependencies.fastGlob = globExport.default || globExport
  }
  return dependencies.fastGlob!
}

/**
 * Get picomatch instance, lazily loading if not set.
 */
export function getPicomatch(): Picomatch {
  if (!dependencies.picomatch) {
    dependencies.picomatch = require('../../external/picomatch')
  }
  return dependencies.picomatch!
}

/**
 * Set cacache instance (useful for testing or custom implementations).
 */
export function setCacache(cacache: Cacache): void {
  dependencies.cacache = cacache
}

/**
 * Set del instance (useful for testing).
 */
export function setDel(del: Del): void {
  dependencies.del = del
}

/**
 * Set fast-glob instance (useful for testing).
 */
export function setFastGlob(fastGlob: FastGlob): void {
  dependencies.fastGlob = fastGlob
}

/**
 * Set picomatch instance (useful for testing).
 */
export function setPicomatch(picomatch: Picomatch): void {
  dependencies.picomatch = picomatch
}

/**
 * Reset all file system dependencies to undefined (forces reload on next access).
 */
export function resetFileSystemDependencies(): void {
  dependencies.cacache = undefined
  dependencies.del = undefined
  dependencies.fastGlob = undefined
  dependencies.picomatch = undefined
}
