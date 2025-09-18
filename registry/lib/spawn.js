'use strict'

const { isArray: ArrayIsArray } = Array
const { hasOwn: ObjectHasOwn, keys: ObjectKeys } = Object

const { getOwn } = /*@__PURE__*/ require('./objects')
const { stripAnsi } = /*@__PURE__*/ require('./strings')

const windowsScriptExtRegExp = /\.(?:cmd|bat|ps1)$/i

let _child_process
/**
 * Lazily load the child_process module.
 * @returns {import('child_process')} The Node.js child_process module.
 */
/*@__NO_SIDE_EFFECTS__*/
function getChildProcess() {
  if (_child_process === undefined) {
    // Use non-'node:' prefixed require to avoid Webpack errors.
    // eslint-disable-next-line n/prefer-node-protocol
    _child_process = /*@__PURE__*/ require('child_process')
  }
  return _child_process
}

let _npmCliPromiseSpawn
/**
 * Lazily load the promise-spawn module for async process spawning.
 * @returns {Function} The promise-spawn module.
 */
/*@__NO_SIDE_EFFECTS__*/
function getNpmcliPromiseSpawn() {
  if (_npmCliPromiseSpawn === undefined) {
    _npmCliPromiseSpawn = /*@__PURE__*/ require('../external/@npmcli/promise-spawn')
  }
  return _npmCliPromiseSpawn
}

let _path
/**
 * Lazily load the path module to avoid Webpack errors.
 * @returns {import('path')} The Node.js path module.
 */
/*@__NO_SIDE_EFFECTS__*/
function getPath() {
  if (_path === undefined) {
    // Use non-'node:' prefixed require to avoid Webpack errors.
    // eslint-disable-next-line n/prefer-node-protocol
    _path = /*@__PURE__*/ require('path')
  }
  return _path
}

/**
 * Check if a value is a spawn error.
 * @param {any} value - The value to check.
 * @returns {value is SpawnError} True if the value is a spawn error.
 * @typedef {Object} SpawnError
 * @property {string[]} args - Command arguments.
 * @property {string} cmd - Command that was run.
 * @property {number} code - Exit code.
 * @property {string} name - Error name.
 * @property {string} message - Error message.
 * @property {AbortSignal | null} signal - Abort signal.
 * @property {string} stack - Stack trace.
 * @property {string | Buffer} stderr - Standard error output.
 * @property {string | Buffer} stdout - Standard output.
 */
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

/**
 * Check if stdio configuration matches a specific type.
 * @param {string | string[] | readonly string[]} stdio - The stdio configuration.
 * @param {import('child_process').IOType | 'ipc' | Array<import('child_process').IOType | 'ipc'>} type - The type to check.
 * @returns {boolean} True if the stdio matches the type.
 */
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

/**
 * Strip ANSI escape codes from spawn result stdout and stderr.
 * @param {{ stdout?: string; stderr?: string }} result - The spawn result.
 * @returns {{ stdout?: string; stderr?: string }} The result with ANSI codes stripped.
 */
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
/**
 * Spawn a child process with enhanced error handling and output capture.
 * @template {SpawnOptions} O
 * @param {string} cmd - The command to execute.
 * @param {string[] | readonly string[]} [args=[]] - Arguments to pass to the command.
 * @param {O} [options] - Spawn options.
 * @param {Record<any, any>} [extra] - Additional data to include in the result.
 * @returns {SpawnResult<O extends {stdioString: false} ? Buffer : string, typeof extra>} Command result with process handle.
 * @typedef {import('./objects').Remap<import('child_process').SpawnOptions & {spinner?: import('./spinner').Spinner; stdioString?: boolean; stripAnsi?: boolean}>} SpawnOptions
 * @typedef {Promise<SpawnStdioResult> & {process: import('child_process').ChildProcess; stdin: import('stream').Writable | null}} SpawnResult
 * @typedef {{cmd: string; args: string[] | readonly string[]; code: number; signal: AbortSignal | null; stdout: string | Buffer; stderr: string | Buffer}} SpawnStdioResult
 */
function spawn(cmd, args, options, extra) {
  // On Windows with shell: true, use just the command name, not the full path.
  // When shell: true is used, Windows cmd.exe has issues executing full paths to
  // .cmd/.bat files (e.g., 'C:\...\pnpm.cmd'), often resulting in ENOENT errors.
  // Using just the command name (e.g., 'pnpm') allows cmd.exe to find it via PATH.
  // See: https://github.com/nodejs/node/issues/3675
  // Check for .cmd, .bat, .ps1 extensions that indicate a Windows script.
  const shell = getOwn(options, 'shell')
  const WIN32 = /*@__PURE__*/ require('./constants/win32')
  if (WIN32 && shell && windowsScriptExtRegExp.test(cmd)) {
    const path = getPath()
    // Extract just the command name without path and extension.
    cmd = path.basename(cmd, path.extname(cmd))
  }
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
  const npmCliPromiseSpawn = getNpmcliPromiseSpawn()
  let spawnPromise = npmCliPromiseSpawn(
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
/**
 * Synchronously spawn a child process.
 * @param {string} cmd - The command to execute.
 * @param {string[] | readonly string[]} [args] - Arguments to pass to the command.
 * @param {SpawnSyncOptions} [options] - Spawn options without spinner support.
 * @returns {import('child_process').SpawnSyncReturns<string | Buffer>} Command result.
 * @typedef {Omit<SpawnOptions, 'spinner'>} SpawnSyncOptions
 */
function spawnSync(cmd, args, options) {
  // On Windows with shell: true, use just the command name, not the full path.
  // When shell: true is used, Windows cmd.exe has issues executing full paths to
  // .cmd/.bat files (e.g., 'C:\...\pnpm.cmd'), often resulting in ENOENT errors.
  // Using just the command name (e.g., 'pnpm') allows cmd.exe to find it via PATH.
  // See: https://github.com/nodejs/node/issues/3675
  // Check for .cmd, .bat, .ps1 extensions that indicate a Windows script.
  const shell = getOwn(options, 'shell')
  const WIN32 = /*@__PURE__*/ require('./constants/win32')
  if (WIN32 && shell && windowsScriptExtRegExp.test(cmd)) {
    const path = getPath()
    // Extract just the command name without path and extension.
    cmd = path.basename(cmd, path.extname(cmd))
  }
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
