'use strict'

let _child_process
/*@__NO_SIDE_EFFECTS__*/
function getChildProcess() {
  if (_child_process === undefined) {
    // Use non-'node:' prefixed require to avoid Webpack errors.
    // eslint-disable-next-line n/prefer-node-protocol
    _child_process = /*@__PURE__*/ require('child_process')
  }
  return _child_process
}

let _spawn
/*@__NO_SIDE_EFFECTS__*/
function getSpawn() {
  if (_spawn === undefined) {
    _spawn = /*@__PURE__*/ require('@npmcli/promise-spawn')
  }
  return _spawn
}

/*@__NO_SIDE_EFFECTS__*/
function spawn(cmd, args, options, extra) {
  const {
    spinner = /*@__PURE__*/ require('./constants/spinner'),
    ...spawnOptions
  } = { __proto__: null, ...options }
  const spawn = getSpawn()
  const isSpinning = !!spinner?.isSpinning
  spinner?.stop()
  let spawnPromise = spawn(
    cmd,
    args,
    {
      signal: /*@__PURE__*/ require('./constants/abort-signal'),
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

/*@__NO_SIDE_EFFECTS__*/
function spawnSync(...args) {
  return getChildProcess().spawnSync(...args)
}

module.exports = {
  spawn,
  spawnSync
}
