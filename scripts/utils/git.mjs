/**
 * @fileoverview Git operations with package filtering utilities.
 */

import path from 'node:path'
// Import from registry v2.0 (async only)
import { getChangedFiles } from '@socketsecurity/lib/git'
import { normalizePath } from '@socketsecurity/lib/path'
import constants from '../constants.mjs'
// Import sync and additional functions from helpers
import {
  getChangedFilesSync,
  getStagedFiles,
  getStagedFilesSync,
  getUnstagedFiles,
  getUnstagedFilesSync,
  isUnstaged as isUnstagedImport,
  isUnstagedSync as isUnstagedSyncImport,
} from './git-helpers.mjs'
import { getGlobMatcher } from './globs.mjs'

const { NPM } = constants

function innerGetPackages(eco, files, options) {
  const { asSet = false, ...matcherOptions } = { __proto__: null, ...options }
  const ecoPackagesPath = path.join(constants.rootPackagesPath, eco)
  const { rootPath } = constants
  const relEcoPackagesPath = normalizePath(
    path.relative(rootPath, ecoPackagesPath),
  )
  const matcher = getGlobMatcher(
    [
      `${relEcoPackagesPath}/**`,
      ...(eco === NPM ? [`${constants.relRegistryPkgPath}/**`] : []),
    ],
    {
      ...matcherOptions,
      absolute: false,
      cwd: rootPath,
    },
  )
  const sliceStart = relEcoPackagesPath.length + 1
  const packageNames = new Set()
  for (const filepath of files) {
    if (matcher(filepath)) {
      let sockRegPkgName
      if (eco === NPM && filepath.startsWith(constants.relRegistryPkgPath)) {
        sockRegPkgName = '../../registry/dist/index.js'
      } else {
        sockRegPkgName = filepath.slice(
          sliceStart,
          filepath.indexOf('/', sliceStart),
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
async function getAllChangedPackages(eco, options) {
  return innerGetPackages(eco, await getChangedFiles(), options)
}

/**
 * Get all changed package names for the specified ecosystem.
 */
function getAllChangedPackagesSync(eco, options) {
  return innerGetPackages(eco, getChangedFilesSync(), options)
}

/**
 * Get modified package names for the specified ecosystem.
 */
async function getModifiedPackages(eco, options) {
  return innerGetPackages(eco, await getUnstagedFiles(), options)
}

/**
 * Get modified package names for the specified ecosystem.
 */
function getModifiedPackagesSync(eco, options) {
  return innerGetPackages(eco, getUnstagedFilesSync(), options)
}

/**
 * Get staged package names for the specified ecosystem.
 */
async function getStagedPackages(eco, options) {
  return innerGetPackages(eco, await getStagedFiles(), options)
}

/**
 * Get staged package names for the specified ecosystem.
 */
function getStagedPackagesSync(eco, options) {
  return innerGetPackages(eco, getStagedFilesSync(), options)
}

/**
 * Alias for getUnstagedFiles.
 */
export async function getModifiedFiles(options) {
  return await getUnstagedFiles(options)
}

/**
 * Alias for getUnstagedFilesSync.
 */
export function getModifiedFilesSync(options) {
  return getUnstagedFilesSync(options)
}

/**
 * Alias for isUnstaged.
 */
export async function isModified(pathname, options) {
  return await isUnstagedImport(pathname, options)
}

/**
 * Alias for isUnstagedSync.
 */
export function isModifiedSync(pathname, options) {
  return isUnstagedSyncImport(pathname, options)
}

/**
 * Filter packages to only those with changes, unless force mode is enabled.
 */
export async function filterPackagesByChanges(packages, eco, options) {
  const { force = false, packageKey = 'socketPackage' } = {
    __proto__: null,
    ...options,
  }
  if (force) {
    return packages
  }
  const changedPackages = await getAllChangedPackages(eco)
  if (changedPackages.length === 0) {
    return []
  }
  const changedSet = new Set(changedPackages)
  return packages.filter(pkg => {
    const pkgName = pkg[packageKey] || pkg.package
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
