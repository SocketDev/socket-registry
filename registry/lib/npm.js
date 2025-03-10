'use strict'

const constants = /*@__PURE__*/ require('./constants')
const { isDebug } = /*@__PURE__*/ require('./debug')
const { spawn } = /*@__PURE__*/ require('./spawn')

let _fs
/*@__NO_SIDE_EFFECTS__*/
function getFs() {
  if (_fs === undefined) {
    // Use non-'node:' prefixed require to avoid Webpack errors.
    // eslint-disable-next-line n/prefer-node-protocol
    _fs = /*@__PURE__*/ require('fs')
  }
  return _fs
}

let _which
/*@__NO_SIDE_EFFECTS__*/
function getWhich() {
  if (_which === undefined) {
    _which = /*@__PURE__*/ require('which')
  }
  return _which
}

const auditFlags = new Set(['--audit', '--no-audit'])

const fundFlags = new Set(['--fund', '--no-fund'])

// https://docs.npmjs.com/cli/v11/using-npm/logging#aliases
const logFlags = new Set([
  '--loglevel',
  '-d',
  '--dd',
  '--ddd',
  '-q',
  '--quiet',
  '-s',
  '--silent'
])

const progressFlags = new Set(['--progress', '--no-progress'])

/*@__NO_SIDE_EFFECTS__*/
function execNpm(args, options) {
  const useDebug = isDebug()
  const terminatorPos = args.indexOf('--')
  const npmArgs = (
    terminatorPos === -1 ? args : args.slice(0, terminatorPos)
  ).filter(a => !isAuditFlag(a) && !isFundFlag(a) && !isProgressFlag(a))
  const otherArgs = terminatorPos === -1 ? [] : args.slice(terminatorPos)
  const logLevelArgs =
    // The default value of loglevel is "notice". We default to "warn" which is
    // one level quieter.
    useDebug || npmArgs.some(isLoglevelFlag) ? [] : ['--loglevel', 'warn']
  return spawn(
    // Lazily access constants.execPath.
    constants.execPath,
    [
      // Lazily access constants.nodeNoWarningsFlags.
      ...constants.nodeNoWarningsFlags,
      // Lazily access constants.npmExecPath.
      constants.npmExecPath,
      // Even though '--loglevel=error' is passed npm will still run through
      // code paths for 'audit' and 'fund' unless '--no-audit' and '--no-fund'
      // flags are passed.
      '--no-audit',
      '--no-fund',
      // Add `--no-progress` and `--silent` flags to fix input being swallowed
      // by the spinner when running the command with recent versions of npm.
      '--no-progress',
      // Add '--loglevel=error' if a loglevel flag is not provided and the
      // SOCKET_CLI_DEBUG environment variable is not truthy.
      ...logLevelArgs,
      ...npmArgs,
      ...otherArgs
    ],
    {
      __proto__: null,
      ...options,
      shell: true
    }
  )
}

/*@__NO_SIDE_EFFECTS__*/
function isAuditFlag(cmdArg) {
  return auditFlags.has(cmdArg)
}

/*@__NO_SIDE_EFFECTS__*/
function isFundFlag(cmdArg) {
  return fundFlags.has(cmdArg)
}

/*@__NO_SIDE_EFFECTS__*/
function isLoglevelFlag(cmdArg) {
  // https://docs.npmjs.com/cli/v11/using-npm/logging#setting-log-levels
  return cmdArg.startsWith('--loglevel=') || logFlags.has(cmdArg)
}

/*@__NO_SIDE_EFFECTS__*/
function isProgressFlag(cmdArg) {
  return progressFlags.has(cmdArg)
}

/*@__NO_SIDE_EFFECTS__*/
function resolveBinPath(binPath) {
  const fs = getFs()
  // Lazily access constants.WIN32.
  if (constants.WIN32) {
    // Trim trailing .cmd and .ps1 extensions.
    const noCmdOrPs1Ext = binPath.replace(/\.(?:cmd|ps1)$/, '')
    if (binPath !== noCmdOrPs1Ext && fs.existsSync(noCmdOrPs1Ext)) {
      binPath = noCmdOrPs1Ext
    }
  }
  return fs.realpathSync.native(binPath)
}

/*@__NO_SIDE_EFFECTS__*/
function runBin(binPath, args, options) {
  return spawn(
    // Lazily access constants.execPath.
    constants.execPath,
    [
      // Lazily access constants.nodeNoWarningsFlags.
      ...constants.nodeNoWarningsFlags,
      binPath.includes('/') || binPath.includes('\\')
        ? resolveBinPath(binPath)
        : whichBinSync(binPath),
      ...args
    ],
    options
  )
}

/*@__NO_SIDE_EFFECTS__*/
function runScript(scriptName, args, options) {
  const { prepost, ...spawnOptions } = { __proto__: null, ...options }
  // Lazily access constants.SUPPORTS_NODE_RUN.
  const useNodeRun = !prepost && constants.SUPPORTS_NODE_RUN
  return spawn(
    // Lazily access constants.execPath.
    constants.execPath,
    [
      // Lazily access constants.nodeNoWarningsFlags.
      ...constants.nodeNoWarningsFlags,
      ...(useNodeRun
        ? ['--run']
        : // Lazily access constants.npmExecPath.
          [constants.npmExecPath, 'run']),
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

async function whichBin(binName, options) {
  const which = getWhich()
  // Depending on options `which` may throw if `binName` is not found.
  // The default behavior is to throw when `binName` is not found.
  return resolveBinPath(await which(binName, options))
}

function whichBinSync(binName, options) {
  // Depending on options `which` may throw if `binName` is not found.
  // The default behavior is to throw when `binName` is not found.
  return resolveBinPath(getWhich().sync(binName, options))
}

module.exports = {
  execNpm,
  isAuditFlag,
  isFundFlag,
  isLoglevelFlag,
  isProgressFlag,
  resolveBinPath,
  runBin,
  runScript,
  whichBin,
  whichBinSync
}
