'use strict'

let _spawn
function getSpawn() {
  if (_spawn === undefined) {
    const id = '@npmcli/promise-spawn'
    _spawn = require(id)
  }
  return _spawn
}

const constants = require('./constants')
const { WIN32, execPath } = constants

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
  const spawn = getSpawn()
  return await spawn(
    WIN32 ? binPath : execPath,
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
  // Lazily access constants.SUPPORTS_NODE_RUN and constants.npmExecPath.
  const useNodeRun = !prepost && constants.SUPPORTS_NODE_RUN
  const cmd = useNodeRun ? execPath : constants.npmExecPath
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
