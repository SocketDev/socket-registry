'use strict'

const path = require('node:path')

const constants = require('@socketregistry/scripts/constants')
const { getGlobMatcher } = require('@socketsecurity/registry/lib/globs')
const { defineLazyGetters } = require('@socketsecurity/registry/lib/objects')
const { normalizePath } = require('@socketsecurity/registry/lib/path')
const { spawn, spawnSync } = require('@socketsecurity/registry/lib/spawn')
const { stripAnsi } = require('@socketsecurity/registry/lib/strings')

const { NPM, UTF8 } = constants

const gitDiffCache = new Map()

const gitDiffSpawnArgs = defineLazyGetters(
  { __proto__: null },
  {
    modified: () => [
      // Lazily access constants.gitExecPath.
      constants.gitExecPath,
      ['diff', '--name-only'],
      {
        // Lazily access constants.rootPath.
        cwd: constants.rootPath,
        // Encoding option used for spawnSync.
        encoding: UTF8
      }
    ],
    staged: () => [
      // Lazily access constants.gitExecPath.
      constants.gitExecPath,
      ['diff', '--cached', '--name-only'],
      {
        // Lazily access constants.rootPath.
        cwd: constants.rootPath,
        shell: true,
        // Encoding option used for spawnSync.
        encoding: UTF8
      }
    ]
  }
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
  // Lazily access constants.rootPackagesPath.
  const ecoPackagesPath = path.join(constants.rootPackagesPath, eco)
  // Lazily access constants.rootPath.
  const { rootPath } = constants
  const relEcoPackagesPath = normalizePath(
    path.relative(rootPath, ecoPackagesPath)
  )
  const matcher = getGlobMatcher(
    [
      `${relEcoPackagesPath}/**`,
      // Lazily access constants.relRegistryPkgPath.
      ...(eco === NPM ? [`${constants.relRegistryPkgPath}/**`] : [])
    ],
    {
      __proto__: null,
      ...matcherOptions,
      absolute: false,
      cwd: rootPath
    }
  )
  const sliceStart = relEcoPackagesPath.length + 1
  const packageNames = new Set()
  for (const filepath of files) {
    if (matcher(filepath)) {
      let sockRegPkgName
      // Lazily access constants.relRegistryPkgPath.
      if (eco === NPM && filepath.startsWith(constants.relRegistryPkgPath)) {
        sockRegPkgName = '@socketsecurity/registry'
      } else {
        sockRegPkgName = filepath.slice(
          sliceStart,
          filepath.indexOf('/', sliceStart)
        )
      }
      packageNames.add(sockRegPkgName)
    }
  }
  return asSet ? packageNames : [...packageNames]
}

function diffIncludes(files, pathname) {
  // Lazily access constants.rootPath.
  return files.includes(path.relative(constants.rootPath, pathname))
}

async function forceRelative(fn, options) {
  return await fn({ __proto__: null, ...options, absolute: false })
}

function forceRelativeSync(fn, options) {
  return fn({ __proto__: null, ...options, absolute: false })
}

async function getModifiedFiles(options) {
  return await innerDiff(gitDiffSpawnArgs.modified, options)
}

function getModifiedFilesSync(options) {
  return innerDiffSync(gitDiffSpawnArgs.modified, options)
}

async function getModifiedPackages(eco, options) {
  return innerGetPackages(eco, await getModifiedFiles(), options)
}

function getModifiedPackagesSync(eco, options) {
  return innerGetPackages(eco, getModifiedFilesSync(), options)
}

async function getStagedFiles(options) {
  return await innerDiff(gitDiffSpawnArgs.staged, options)
}

function getStagedFilesSync(options) {
  return innerDiffSync(gitDiffSpawnArgs.staged, options)
}

async function getStagedPackages(eco, options) {
  return innerGetPackages(eco, await getStagedFiles(), options)
}

function getStagedPackagesSync(eco, options) {
  return innerGetPackages(eco, getStagedFilesSync(), options)
}

async function isModified(pathname, options) {
  return diffIncludes(await forceRelative(getModifiedFiles, options), pathname)
}

function isModifiedSync(pathname, options) {
  return diffIncludes(
    forceRelativeSync(getModifiedFilesSync, options),
    pathname
  )
}

async function isStaged(pathname, options) {
  return diffIncludes(await forceRelative(getStagedFiles, options), pathname)
}

function isStagedSync(pathname, options) {
  return diffIncludes(forceRelativeSync(getStagedFilesSync, options), pathname)
}

function parseGitDiffStdout(stdout, options) {
  // Lazily access constants.rootPath.
  const { rootPath } = constants
  const {
    absolute = false,
    cwd = rootPath,
    ...matcherOptions
  } = { __proto__: null, ...options }
  const rawFiles = stdout ? stripAnsi(stdout.trim()).split('\n') : []
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
    cwd: rootPath
  })
  const filtered = []
  for (const filepath of files) {
    if (matcher(filepath)) {
      filtered.push(filepath)
    }
  }
  return filtered
}

module.exports = {
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
  isStagedSync
}
