'use strict'

let _child_process
function getChildProcess() {
  if (_child_process === undefined) {
    _child_process = require('node:child_process')
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
  const { spinner, ...spawnOptions } = { __proto__: null, ...options }
  const spawn = getSpawn()
  const isSpinning = spinner?.isSpinning ?? false
  spinner?.stop()
  let spawnPromise = spawn(cmd, args, spawnOptions, extra)
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
