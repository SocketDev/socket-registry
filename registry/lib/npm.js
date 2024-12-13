'use strict'

const spawn = require('@npmcli/promise-spawn')

const constants = require('./constants')
const { WIN_32, execPath } = constants

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
    [
      ...(WIN_32
        ? []
        : // Lazily access constants.SUPPORTS_NODE_DISABLE_WARNING_FLAG.
          constants.SUPPORTS_NODE_DISABLE_WARNING_FLAG
          ? ['--disable-warning', 'ExperimentalWarning', binPath]
          : ['--no-warnings', binPath]),
      ...args
    ],
    {
      __proto__: null,
      ...options,
      shell: true
    }
  )
}

async function runScript(scriptName, args, options) {
  const { prepost, ...spawnOptions } = { __proto__: null, ...options }
  // Lazily access constants.SUPPORTS_NODE_RUN and constants.npmExecPath.
  const useNodeRun = !prepost && constants.SUPPORTS_NODE_RUN
  const cmd = useNodeRun ? execPath : constants.npmExecPath
  return await spawn(
    cmd,
    [
      ...(useNodeRun
        ? constants.SUPPORTS_NODE_DISABLE_WARNING_FLAG
          ? ['--disable-warning', 'ExperimentalWarning', '--run']
          : ['--no-warnings', '--run']
        : ['run']),
      scriptName,
      ...args
    ],
    {
      __proto__: null,
      ...spawnOptions,
      shell: true
    }
  )
}

module.exports = {
  execNpm,
  runBin,
  runScript
}
