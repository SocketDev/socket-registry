/**
 * @fileoverview Git operations including diff detection and file tracking.
 * Provides utilities for git-based file change detection and repository management.
 */

import path from 'node:path'

import constants from '../constants.mjs'
import { getGlobMatcher } from '../../registry/dist/lib/globs.js'
import { defineLazyGetters } from '../../registry/dist/lib/objects.js'
import { normalizePath } from '../../registry/dist/lib/path.js'
import { spawn, spawnSync } from '../../registry/dist/lib/spawn.js'
import { stripAnsi } from '../../registry/dist/lib/strings.js'

const { NPM, UTF8 } = constants

const gitDiffCache = new Map()

const gitDiffSpawnArgs = defineLazyGetters(
  { __proto__: null },
  {
    all: () => [
      constants.gitExecPath,
      ['status', '--porcelain'],
      {
        cwd: constants.rootPath,
        shell: constants.WIN32,
        encoding: UTF8,
      },
    ],
    modified: () => [
      constants.gitExecPath,
      ['diff', '--name-only'],
      {
        cwd: constants.rootPath,
        // Encoding option used for spawnSync.
        encoding: UTF8,
      },
    ],
    staged: () => [
      constants.gitExecPath,
      ['diff', '--cached', '--name-only'],
      {
        cwd: constants.rootPath,
        shell: constants.WIN32,
        // Encoding option used for spawnSync.
        encoding: UTF8,
      },
    ],
  },
)

async function innerDiff(args, options) {
  const { cache = true, ...parseOptions } = { __proto__: null, ...options }
  const cacheKey = cache ? JSON.stringify({ args, parseOptions }) : undefined
  if (cache) {
    const result = gitDiffCache.get(cacheKey)
    if (result) {
      return result
    }
  }
  let result
  try {
    result = parseGitDiffStdout((await spawn(...args)).stdout, parseOptions)
  } catch {
    return []
  }
  if (cache) {
    gitDiffCache.set(cacheKey, result)
  }
  return result
}

function innerDiffSync(args, options) {
  const { cache = true, ...parseOptions } = { __proto__: null, ...options }
  const cacheKey = cache ? JSON.stringify({ args, parseOptions }) : undefined
  if (cache) {
    const result = gitDiffCache.get(cacheKey)
    if (result) {
      return result
    }
  }
  let result
  try {
    result = parseGitDiffStdout(spawnSync(...args).stdout, parseOptions)
  } catch {
    return []
  }
  if (cache) {
    gitDiffCache.set(cacheKey, result)
  }
  return result
}

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
      __proto__: null,
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

function diffIncludes(files, pathname) {
  return files.includes(path.relative(constants.rootPath, pathname))
}

async function forceRelative(fn, options) {
  return await fn({ __proto__: null, ...options, absolute: false })
}

function forceRelativeSync(fn, options) {
  return fn({ __proto__: null, ...options, absolute: false })
}

/**
 * Get all changed files including staged, modified, and untracked files.
 */
async function getAllChangedFiles(options) {
  return await innerDiff(gitDiffSpawnArgs.all, {
    __proto__: null,
    ...options,
    porcelain: true,
  })
}

/**
 * Get all changed files including staged, modified, and untracked files.
 */
function getAllChangedFilesSync(options) {
  return innerDiffSync(gitDiffSpawnArgs.all, {
    __proto__: null,
    ...options,
    porcelain: true,
  })
}

/**
 * Get all changed package names for the specified ecosystem.
 */
async function getAllChangedPackages(eco, options) {
  return innerGetPackages(eco, await getAllChangedFiles(), options)
}

/**
 * Get all changed package names for the specified ecosystem.
 */
function getAllChangedPackagesSync(eco, options) {
  return innerGetPackages(eco, getAllChangedFilesSync(), options)
}

/**
 * Get modified files that are not staged.
 */
async function getModifiedFiles(options) {
  return await innerDiff(gitDiffSpawnArgs.modified, options)
}

/**
 * Get modified files that are not staged.
 */
function getModifiedFilesSync(options) {
  return innerDiffSync(gitDiffSpawnArgs.modified, options)
}

/**
 * Get modified package names for the specified ecosystem.
 */
async function getModifiedPackages(eco, options) {
  return innerGetPackages(eco, await getModifiedFiles(), options)
}

/**
 * Get modified package names for the specified ecosystem.
 */
function getModifiedPackagesSync(eco, options) {
  return innerGetPackages(eco, getModifiedFilesSync(), options)
}

/**
 * Get staged files ready for commit.
 */
async function getStagedFiles(options) {
  return await innerDiff(gitDiffSpawnArgs.staged, options)
}

/**
 * Get staged files ready for commit.
 */
function getStagedFilesSync(options) {
  return innerDiffSync(gitDiffSpawnArgs.staged, options)
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
 * Check if pathname is modified but not staged.
 */
async function isModified(pathname, options) {
  return diffIncludes(await forceRelative(getModifiedFiles, options), pathname)
}

/**
 * Check if pathname is modified but not staged.
 */
function isModifiedSync(pathname, options) {
  return diffIncludes(
    forceRelativeSync(getModifiedFilesSync, options),
    pathname,
  )
}

/**
 * Check if pathname is staged for commit.
 */
async function isStaged(pathname, options) {
  return diffIncludes(await forceRelative(getStagedFiles, options), pathname)
}

/**
 * Check if pathname is staged for commit.
 */
function isStagedSync(pathname, options) {
  return diffIncludes(forceRelativeSync(getStagedFilesSync, options), pathname)
}

function parseGitDiffStdout(stdout, options) {
  const { rootPath } = constants
  const {
    absolute = false,
    cwd = rootPath,
    porcelain = false,
    ...matcherOptions
  } = { __proto__: null, ...options }
  let rawFiles = stdout ? stripAnsi(stdout.trim()).split('\n') : []
  // Parse porcelain format: strip status codes (first 3 characters).
  if (porcelain) {
    rawFiles = rawFiles
      .filter(line => line.trim())
      .map(line => line.substring(3))
  }
  const files = absolute
    ? rawFiles.map(relPath => normalizePath(path.join(rootPath, relPath)))
    : rawFiles.map(relPath => normalizePath(relPath))
  if (cwd === rootPath) {
    return files
  }
  const relPath = normalizePath(path.relative(rootPath, cwd))
  const matcher = getGlobMatcher([`${relPath}/**`], {
    __proto__: null,
    ...matcherOptions,
    absolute,
    cwd: rootPath,
  })
  const filtered = []
  for (const filepath of files) {
    if (matcher(filepath)) {
      filtered.push(filepath)
    }
  }
  return filtered
}

export {
  getAllChangedFiles,
  getAllChangedFilesSync,
  getAllChangedPackages,
  getAllChangedPackagesSync,
  getModifiedFiles,
  getModifiedFilesSync,
  getModifiedPackages,
  getModifiedPackagesSync,
  getStagedFiles,
  getStagedFilesSync,
  getStagedPackages,
  getStagedPackagesSync,
  isModified,
  isModifiedSync,
  isStaged,
  isStagedSync,
}
