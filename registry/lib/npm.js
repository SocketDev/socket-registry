'use strict'

const constants = require('./constants')

let _spawn
function getSpawn() {
  if (_spawn === undefined) {
    _spawn = require('@npmcli/promise-spawn')
  }
  return _spawn
}

function execNpm(args, options) {
  const { spinner, ...spawnOptions } = { __proto__: null, ...options }
  const spawn = getSpawn()
  const isSpinning = spinner?.isSpinning ?? false
  spinner?.stop()
  let spawnPromise = spawn(
    // Lazily access constants.npmExecPath.
    constants.npmExecPath,
    args,
    {
      __proto__: null,
      ...spawnOptions,
      shell: true
    }
  )
  if (isSpinning) {
    const oldSpawnPromise = spawnPromise
    spawnPromise = spawnPromise.finally(() => {
      spinner?.start()
    })
    spawnPromise.process = oldSpawnPromise.process
    spawnPromise.stdin = oldSpawnPromise.stdin
  }
  return spawnPromise
}

function runBin(binPath, args, options) {
  const { spinner, ...spawnOptions } = { __proto__: null, ...options }
  // Lazily access constants.WIN32.
  const { WIN32 } = constants
  const spawn = getSpawn()
  const isSpinning = spinner?.isSpinning ?? false
  spinner?.stop()
  let spawnPromise = spawn(
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
      ...spawnOptions,
      shell: true
    }
  )
  if (isSpinning) {
    const oldSpawnPromise = spawnPromise
    spawnPromise = spawnPromise.finally(() => {
      spinner?.start()
    })
    spawnPromise.process = oldSpawnPromise.process
    spawnPromise.stdin = oldSpawnPromise.stdin
  }
  return spawnPromise
}

function runScript(scriptName, args, options) {
  const { prepost, spinner, ...spawnOptions } = { __proto__: null, ...options }
  // Lazily access constants.SUPPORTS_NODE_RUN.
  const useNodeRun = !prepost && constants.SUPPORTS_NODE_RUN
  // Lazily access constants.execPath and constants.npmExecPath.
  const cmd = useNodeRun ? constants.execPath : constants.npmExecPath
  const spawn = getSpawn()
  const isSpinning = spinner?.isSpinning ?? false
  spinner?.stop()
  let spawnPromise = spawn(
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
  if (isSpinning) {
    const oldSpawnPromise = spawnPromise
    spawnPromise = spawnPromise.finally(() => {
      spinner?.start()
    })
    spawnPromise.process = oldSpawnPromise.process
    spawnPromise.stdin = oldSpawnPromise.stdin
  }
  return spawnPromise
}

module.exports = {
  execNpm,
  runBin,
  runScript
}
