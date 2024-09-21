'use strict'

const { spawnSync } = require('node:child_process')
const path = require('node:path')

const spawn = require('@npmcli/promise-spawn')

const { gitExecPath, rootPath } = require('@socketregistry/scripts/constants')
const { getGlobMatcher } = require('@socketregistry/scripts/utils/path')

const spawnArgsGitStaged = [
  gitExecPath,
  ['diff', '--cached', '--name-only'],
  {
    cwd: rootPath,
    encoding: 'utf8'
  }
]

function innerGetStagedFiles(stdout, options) {
  const { absolute } = { ...options }
  const stagedFiles = stdout?.split('\n') ?? []
  return absolute
    ? stagedFiles.map(rel => path.join(rootPath, rel))
    : stagedFiles.map(rel => path.normalize(rel))
}

async function getStagedFiles(options) {
  try {
    return innerGetStagedFiles(
      (await spawn(...spawnArgsGitStaged)).stdout,
      options
    )
  } catch {}
  return []
}

function getStagedFilesSync(options) {
  try {
    return innerGetStagedFiles(spawnSync(...spawnArgsGitStaged).stdout, options)
  } catch {}
  return []
}

function isPathStagedSync(dirname) {
  const stagedFiles = getStagedFilesSync()
  const matcher = getGlobMatcher([`${path.relative(rootPath, dirname)}/**`], {
    cwd: rootPath
  })
  return stagedFiles.some(rel => matcher(rel))
}

module.exports = {
  getStagedFiles,
  getStagedFilesSync,
  isPathStagedSync
}
