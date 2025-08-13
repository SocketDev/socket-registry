'use strict'

const { isArray: ArrayIsArray } = Array
const { hasOwn: ObjectHasOwn, keys: ObjectKeys } = Object

const { stripAnsi } = /*@__PURE__*/ require('./strings')

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
    _spawn = /*@__PURE__*/ require('../external/@npmcli/promise-spawn')
  }
  return _spawn
}

/*@__NO_SIDE_EFFECTS__*/
function isSpawnError(value) {
  return (
    value !== null &&
    typeof value === 'object' &&
    ObjectHasOwn(value, 'code') &&
    typeof value.code === 'number' &&
    ObjectHasOwn(value, 'cmd') &&
    typeof value.code === 'string' &&
    ObjectHasOwn(value, 'args') &&
    ArrayIsArray(value.args)
  )
}

/*@__NO_SIDE_EFFECTS__*/
function isStdioType(stdio, type) {
  return (
    stdio === type ||
    ((stdio === null || stdio === undefined) && type === 'pipe') ||
    (ArrayIsArray(stdio) &&
      stdio.length > 2 &&
      stdio[0] === type &&
      stdio[1] === type &&
      stdio[2] === type)
  )
}

/*@__NO_SIDE_EFFECTS__*/
function stripAnsiFromSpawnResult(result) {
  const { stderr, stdout } = result
  if (typeof stdout === 'string') {
    result.stdout = stripAnsi(stdout)
  }
  if (typeof stderr === 'string') {
    result.stderr = stripAnsi(stderr)
  }
  return result
}

/*@__NO_SIDE_EFFECTS__*/
function spawn(cmd, args, options, extra) {
  const {
    spinner = /*@__PURE__*/ require('./constants/spinner'),
    stripAnsi: shouldStripAnsi = true,
    ...spawnOptions
  } = { __proto__: null, ...options }
  const { env, stdio, stdioString = true } = spawnOptions
  // The stdio option can be a string or an array.
  // https://nodejs.org/api/child_process.html#optionsstdio
  const wasSpinning = !!spinner?.isSpinning
  const shouldStopSpinner =
    wasSpinning && !isStdioType(stdio, 'ignore') && !isStdioType(stdio, 'pipe')
  const shouldRestartSpinner = shouldStopSpinner
  if (shouldStopSpinner) {
    spinner.stop()
  }
  const spawn = getSpawn()
  let spawnPromise = spawn(
    cmd,
    args,
    {
      signal: /*@__PURE__*/ require('./constants/abort-signal'),
      ...spawnOptions,
      // Node includes inherited properties of options.env when it normalizes
      // it due to backwards compatibility. However, this is a prototype sink and
      // undesired behavior so to prevent it we spread options.env onto a fresh
      // object with a null [[Prototype]].
      // https://github.com/nodejs/node/blob/v24.0.1/lib/child_process.js#L674-L678
      env: {
        __proto__: null,
        ...process.env,
        ...env
      }
    },
    extra
  )
  const oldSpawnPromise = spawnPromise
  if (shouldStripAnsi && stdioString) {
    spawnPromise = spawnPromise.then(stripAnsiFromSpawnResult).catch(error => {
      throw stripAnsiFromSpawnResult(error)
    })
  }
  if (shouldRestartSpinner) {
    spawnPromise = spawnPromise.finally(() => {
      spinner.start()
    })
  }
  for (const key of ObjectKeys(oldSpawnPromise)) {
    spawnPromise[key] = oldSpawnPromise[key]
  }
  return spawnPromise
}

/*@__NO_SIDE_EFFECTS__*/
function spawnSync(cmd, args, options) {
  const { stripAnsi: shouldStripAnsi = true, ...rawSpawnOptions } = {
    __proto__: null,
    ...options
  }
  const { stdioString: rawStdioString = true } = rawSpawnOptions
  const rawEncoding = rawStdioString ? 'utf8' : 'buffer'
  const spawnOptions = {
    encoding: rawEncoding,
    ...rawSpawnOptions
  }
  const stdioString = spawnOptions.encoding !== 'buffer'
  const result = getChildProcess().spawnSync(cmd, args, spawnOptions)
  if (stdioString) {
    const { stderr, stdout } = result
    if (stdout) {
      result.stdout = stdout.toString().trim()
    }
    if (stderr) {
      result.stderr = stderr.toString().trim()
    }
  }
  return shouldStripAnsi && stdioString
    ? stripAnsiFromSpawnResult(result)
    : result
}

module.exports = {
  isSpawnError,
  isStdioType,
  spawn,
  spawnSync
}
