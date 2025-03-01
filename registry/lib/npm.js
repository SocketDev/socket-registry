'use strict'

const constants = require('./constants')
const { spawn } = require('./spawn')

function execNpm(args, options) {
  return spawn(
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

function runBin(binPath, args, options) {
  // Lazily access constants.WIN32.
  const { WIN32 } = constants
  return spawn(
    // Lazily access constants.execPath.
    WIN32 ? binPath : constants.execPath,
    [
      ...(WIN32
        ? []
        : [
            // Lazily access constants.nodeNoWarningsFlags.
            ...constants.nodeNoWarningsFlags,
            binPath
          ]),
      ...args
    ],
    {
      __proto__: null,
      ...options,
      shell: true
    }
  )
}

function runScript(scriptName, args, options) {
  const { prepost, ...spawnOptions } = { __proto__: null, ...options }
  // Lazily access constants.SUPPORTS_NODE_RUN.
  const useNodeRun = !prepost && constants.SUPPORTS_NODE_RUN
  // Lazily access constants.execPath and constants.npmExecPath.
  const cmd = useNodeRun ? constants.execPath : constants.npmExecPath
  return spawn(
    cmd,
    [
      ...(useNodeRun
        ? [
            // Lazily access constants.nodeNoWarningsFlags.
            ...constants.nodeNoWarningsFlags,
            '--run'
          ]
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
