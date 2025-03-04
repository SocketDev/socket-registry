'use strict'

const constants = require('./constants')

const { abortSignal } = constants

let _child_process
function getChildProcess() {
  if (_child_process === undefined) {
    // Use non-'node:' prefixed require to avoid Webpack errors.
    // eslint-disable-next-line n/prefer-node-protocol
    _child_process = require('child_process')
  }
  return _child_process
}

let _spawn
function getSpawn() {
  if (_spawn === undefined) {
    _spawn = require('@npmcli/promise-spawn')
  }
  return _spawn
}

function spawn(cmd, args, options, extra) {
  const {
    // Lazily access constants.spinner.
    spinner = constants.spinner,
    ...spawnOptions
  } = { __proto__: null, ...options }
  const spawn = getSpawn()
  const isSpinning = spinner?.isSpinning ?? false
  spinner?.stop()
  let spawnPromise = spawn(
    cmd,
    args,
    {
      signal: abortSignal,
      ...spawnOptions
    },
    extra
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

function spawnSync(...args) {
  return getChildProcess().spawnSync(...args)
}

module.exports = {
  spawn,
  spawnSync
}
