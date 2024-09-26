'use strict'

const { spawnSync } = require('node:child_process')
const path = require('node:path')

const spawn = require('@npmcli/promise-spawn')

const {
  gitExecPath,
  rootPackagesPath,
  rootPath
} = require('@socketregistry/scripts/constants')
const { getGlobMatcher } = require('@socketregistry/scripts/utils/globs')
const { normalizePath } = require('@socketregistry/scripts/utils/path')

const spawnArgsGitDiffModified = [
  gitExecPath,
  ['diff', '--name-only'],
  {
    cwd: rootPath,
    encoding: 'utf8'
  }
]

const spawnArgsGitDiffStaged = [
  gitExecPath,
  ['diff', '--cached', '--name-only'],
  {
    cwd: rootPath,
    encoding: 'utf8'
  }
]

async function innerGetDiff(gitDiffSpawnArgs, options) {
  try {
    return parseGitDiffStdout(
      (await spawn(...gitDiffSpawnArgs)).stdout,
      options
    )
  } catch {}
  return []
}

function innerGetDiffSync(gitDiffSpawnArgs, options) {
  try {
    return parseGitDiffStdout(spawnSync(...gitDiffSpawnArgs).stdout, options)
  } catch {}
  return []
}

function innerGetPackages(eco, stagedFiles, options) {
  const { asSet = false, ...otherOptions } = { __proto__: null, ...options }
  const ecoPackagesPath = path.join(rootPackagesPath, eco)
  const relEcoPackagesPath = normalizePath(
    path.relative(rootPath, ecoPackagesPath)
  )
  const matcher = getGlobMatcher([`${relEcoPackagesPath}/**`], {
    __proto__: null,
    cwd: rootPath,
    ...otherOptions
  })
  const sliceStart = relEcoPackagesPath.length + 1
  const packageNames = new Set()
  for (const stagedFilePath of stagedFiles) {
    if (matcher(stagedFilePath)) {
      const pkgName = stagedFilePath.slice(
        sliceStart,
        stagedFilePath.indexOf('/', sliceStart)
      )
      packageNames.add(pkgName)
    }
  }
  return asSet ? packageNames : [...packageNames]
}

async function getModifiedFiles(options) {
  return await innerGetDiff(spawnArgsGitDiffModified, options)
}

function getModifiedFilesSync(options) {
  return innerGetDiffSync(spawnArgsGitDiffModified, options)
}

async function getModifiedPackages(eco, options) {
  return innerGetPackages(eco, await getModifiedFiles(), options)
}

function getModifiedPackagesSync(eco, options) {
  return innerGetPackages(eco, getModifiedFilesSync(), options)
}

async function getStagedFiles(options) {
  return await innerGetDiff(spawnArgsGitDiffStaged, options)
}

function getStagedFilesSync(options) {
  return innerGetDiffSync(spawnArgsGitDiffStaged, options)
}

async function getStagedPackages(eco, options) {
  return innerGetPackages(eco, await getStagedFiles(), options)
}

function getStagedPackagesSync(eco, options) {
  return innerGetPackages(eco, getStagedFilesSync(), options)
}

function parseGitDiffStdout(stdout, options) {
  const { absolute } = { __proto__: null, ...options }
  const stagedFiles = stdout?.split('\n') ?? []
  return absolute
    ? stagedFiles.map(relPath => normalizePath(path.join(rootPath, relPath)))
    : stagedFiles.map(relPath => normalizePath(relPath))
}

module.exports = {
  getModifiedFiles,
  getModifiedFilesSync,
  getModifiedPackages,
  getModifiedPackagesSync,
  getStagedFiles,
  getStagedFilesSync,
  getStagedPackages,
  getStagedPackagesSync
}
