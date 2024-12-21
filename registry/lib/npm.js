'use strict'

const constants = require('./constants')

let _spawn
function getSpawn() {
  if (_spawn === undefined) {
    const id = '@npmcli/promise-spawn'
    _spawn = require(id)
  }
  return _spawn
}

async function execNpm(args, options) {
  const spawn = getSpawn()
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
  // Lazily access constants.WIN32.
  const { WIN32 } = constants
  const spawn = getSpawn()
  return await spawn(
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

async function runScript(scriptName, args, options) {
  const { prepost, ...spawnOptions } = { __proto__: null, ...options }
  // Lazily access constants.SUPPORTS_NODE_RUN.
  const useNodeRun = !prepost && constants.SUPPORTS_NODE_RUN
  // Lazily access constants.execPath and constants.npmExecPath.
  const cmd = useNodeRun ? constants.execPath : constants.npmExecPath
  const spawn = getSpawn()
  return await spawn(
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
