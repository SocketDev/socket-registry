'use strict'

const spawn = require('@npmcli/promise-spawn')
const semver = require('semver')

const constants = require('@socketregistry/scripts/constants')
const { NODE_VERSION, WIN_32, execPath } = constants

const canUseNodeRun = semver.satisfies(NODE_VERSION, '>=22.3.0')

async function execNpm(args, options) {
  return await spawn(
    // Lazily access constants.npmExecPath.
    constants.npmExecPath,
    args,
    {
      __proto__: null,
      ...options,
      shell: true
    }
  )
}

async function runBin(binPath, args, options) {
  return await spawn(
    WIN_32 ? binPath : execPath,
    [...(WIN_32 ? [] : [binPath]), ...args],
    options
  )
}

async function runScript(scriptName, args, options) {
  const { prepost, ...spawnOptions } = { __proto__: null, ...options }
  // Lazily access constants.npmExecPath.
  const useNode = !prepost && canUseNodeRun
  const cmd = useNode ? execPath : constants.npmExecPath
  const runArg = useNode ? '--run' : 'run'
  return await spawn(cmd, [runArg, scriptName, ...args], spawnOptions)
}

module.exports = {
  execNpm,
  runBin,
  runScript
}
