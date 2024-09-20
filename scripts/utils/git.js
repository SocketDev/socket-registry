'use strict'

const path = require('node:path')
const { spawnSync } = require('node:child_process')

const spawn = require('@npmcli/promise-spawn')

const {
  gitExecPath,
  rootPath
} = require('@socketregistry/scripts/constants')

const gitDiffArgsForStaged = [gitExecPath, ['diff', '--cached', '--name-only'], {
  cwd: rootPath
}]

function innerGitStagedFiles(stdout, options) {
  const { absolute } = { ...options }
  const stagedFiles = stdout?.split('\n') ?? []
  return absolute
    ? stagedFiles.map((rel) => path.join(rootPath, rel))
    : stagedFiles.map((rel) => path.normalize(rel))
}

async function gitStagedFiles(options) {
  try {
    return innerGitStagedFiles((await spawn(...gitDiffArgsForStaged)).stdout, options)
  } catch {}
  return []
}

async function gitStagedFilesSync(options) {
  try {
    return innerGitStagedFiles(spawnSync(...gitDiffArgsForStaged).stdout, options)
  } catch {}
  return []
}

module.exports = {
  gitStagedFiles,
  gitStagedFilesSync
}
