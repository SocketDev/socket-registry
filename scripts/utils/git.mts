/**
 * @fileoverview Git operations with package filtering utilities.
 */

import path from 'node:path'

// Import from registry v2.0 (async only)
import { getChangedFiles } from '@socketsecurity/lib/git'
import { normalizePath } from '@socketsecurity/lib/paths/normalize'

import {
  NPM,
  REL_REGISTRY_PKG_PATH,
  ROOT_PACKAGES_PATH,
  ROOT_PATH,
} from '../constants/paths.mts'
// Import sync and additional functions from helpers
import {
  getChangedFilesSync,
  getStagedFiles,
  getStagedFilesSync,
  getUnstagedFiles,
  getUnstagedFilesSync,
  isUnstaged as isUnstagedImport,
  isUnstagedSync as isUnstagedSyncImport,
} from './git-helpers.mts'
import { getGlobMatcher } from './globs.mts'

interface GetPackagesOptions {
  asSet?: boolean
  [key: string]: unknown
}

function innerGetPackages(
  eco: string,
  files: string[],
  options?: GetPackagesOptions,
): string[] | Set<string> {
  const { asSet = false, ...matcherOptions } = {
    __proto__: null,
    ...options,
  } as GetPackagesOptions
  const ecoPackagesPath = path.join(ROOT_PACKAGES_PATH, eco)
  const relEcoPackagesPath = normalizePath(
    path.relative(ROOT_PATH, ecoPackagesPath),
  )
  const matcher = getGlobMatcher(
    [
      `${relEcoPackagesPath}/**`,
      ...(eco === NPM ? [`${REL_REGISTRY_PKG_PATH}/**`] : []),
    ],
    {
      ...matcherOptions,
      absolute: false,
      cwd: ROOT_PATH,
    },
  )
  const sliceStart = relEcoPackagesPath.length + 1
  const packageNames = new Set()
  for (const filepath of files) {
    if (matcher(filepath)) {
      let sockRegPkgName
      if (eco === NPM && filepath.startsWith(REL_REGISTRY_PKG_PATH)) {
        sockRegPkgName = '../../registry/dist/index.js'
      } else {
        const slashIndex = filepath.indexOf('/', sliceStart)
        sockRegPkgName = filepath.slice(
          sliceStart,
          slashIndex === -1 ? undefined : slashIndex,
        )
      }
      packageNames.add(sockRegPkgName)
    }
  }
  return asSet ? packageNames : Array.from(packageNames)
}

/**
 * Get all changed package names for the specified ecosystem.
 */
async function getAllChangedPackages(
  eco: string,
  options?: GetPackagesOptions,
) {
  return innerGetPackages(eco, await getChangedFiles(), options)
}

/**
 * Get all changed package names for the specified ecosystem.
 */
function getAllChangedPackagesSync(eco: string, options?: GetPackagesOptions) {
  return innerGetPackages(eco, getChangedFilesSync(), options)
}

/**
 * Get modified package names for the specified ecosystem.
 */
async function getModifiedPackages(eco: string, options?: GetPackagesOptions) {
  return innerGetPackages(eco, await getUnstagedFiles(), options)
}

/**
 * Get modified package names for the specified ecosystem.
 */
function getModifiedPackagesSync(eco: string, options?: GetPackagesOptions) {
  return innerGetPackages(eco, getUnstagedFilesSync(), options)
}

/**
 * Get staged package names for the specified ecosystem.
 */
async function getStagedPackages(eco: string, options?: GetPackagesOptions) {
  return innerGetPackages(eco, await getStagedFiles(), options)
}

/**
 * Get staged package names for the specified ecosystem.
 */
function getStagedPackagesSync(eco: string, options?: GetPackagesOptions) {
  return innerGetPackages(eco, getStagedFilesSync(), options)
}

/**
 * Alias for getUnstagedFiles.
 */
export async function getModifiedFiles(options?: { cwd?: string }) {
  return await getUnstagedFiles(options?.cwd)
}

/**
 * Alias for getUnstagedFilesSync.
 */
export function getModifiedFilesSync(options?: { cwd?: string }) {
  return getUnstagedFilesSync(options?.cwd)
}

/**
 * Alias for isUnstaged.
 */
export async function isModified(pathname: string, options?: { cwd?: string }) {
  return await isUnstagedImport(pathname, options?.cwd)
}

/**
 * Alias for isUnstagedSync.
 */
export function isModifiedSync(pathname: string, options?: { cwd?: string }) {
  return isUnstagedSyncImport(pathname, options?.cwd)
}

interface FilterPackagesOptions {
  force?: boolean
  packageKey?: string
}

/**
 * Filter packages to only those with changes, unless force mode is enabled.
 */
export async function filterPackagesByChanges<
  T extends Record<string, unknown>,
>(packages: T[], eco: string, options?: FilterPackagesOptions): Promise<T[]> {
  const { force = false, packageKey = 'socketPackage' } = {
    __proto__: null,
    ...options,
  } as FilterPackagesOptions
  if (force) {
    return packages
  }
  const changedPackages = (await getAllChangedPackages(eco)) as string[]
  if (!changedPackages.length) {
    return []
  }
  const changedSet = new Set(changedPackages)
  return packages.filter(pkg => {
    const pkgName = (pkg[packageKey] as string) || (pkg['package'] as string)
    return changedSet.has(pkgName)
  })
}

export {
  getAllChangedPackages,
  getAllChangedPackagesSync,
  getChangedFiles,
  getChangedFilesSync,
  getModifiedPackages,
  getModifiedPackagesSync,
  getStagedFiles,
  getStagedFilesSync,
  getStagedPackages,
  getStagedPackagesSync,
}
