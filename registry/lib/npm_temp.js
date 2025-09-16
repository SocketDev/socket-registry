'use strict'

const { resolveBinPathSync } = /*@__PURE__*/ require('./bin')
const { isDebug } = /*@__PURE__*/ require('./debug')
const { isPath } = /*@__PURE__*/ require('./path')
const { spawn } = /*@__PURE__*/ require('./spawn')

let _which

const auditFlags = new Set(['--audit', '--no-audit'])
const fundFlags = new Set(['--fund', '--no-fund'])
const logFlags = new Set([
  // --loglevel has several aliases:
  // https://docs.npmjs.com/cli/v11/using-npm/logging#aliases
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
  ).filter(
    a => !isNpmAuditFlag(a) && !isNpmFundFlag(a) && !isNpmProgressFlag(a)
  )
  const otherArgs = terminatorPos === -1 ? [] : args.slice(terminatorPos)
  const logLevelArgs =
    // The default value of loglevel is "notice". We default to "warn" which is
    // one level quieter.
    useDebug || npmArgs.some(isNpmLoglevelFlag) ? [] : ['--loglevel', 'warn']
  return spawn(
    /*@__PURE__*/ require('./constants/exec-path'),
    [
      .../*@__PURE__*/ require('./constants/node-harden-flags'),
      .../*@__PURE__*/ require('./constants/node-no-warnings-flags'),
      /*@__PURE__*/ require('./constants/npm-real-exec-path'),
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
      ...options
    }
  )
}

/*@__NO_SIDE_EFFECTS__*/
function getWhich() {
  if (_which === undefined) {
    _which = /*@__PURE__*/ require('../external/which')
  }
  return _which
}

/*@__NO_SIDE_EFFECTS__*/
function isNpmAuditFlag(cmdArg) {
  return auditFlags.has(cmdArg)
}

/*@__NO_SIDE_EFFECTS__*/
function isNpmFundFlag(cmdArg) {
  return fundFlags.has(cmdArg)
}

/*@__NO_SIDE_EFFECTS__*/
function isNpmLoglevelFlag(cmdArg) {
  // https://docs.npmjs.com/cli/v11/using-npm/logging#setting-log-levels
  return cmdArg.startsWith('--loglevel=') || logFlags.has(cmdArg)
}

/*@__NO_SIDE_EFFECTS__*/
function isNpmNodeOptionsFlag(cmdArg) {
  // https://docs.npmjs.com/cli/v9/using-npm/config#node-options
  return cmdArg.startsWith('--node-options=')
}

/*@__NO_SIDE_EFFECTS__*/
function isNpmProgressFlag(cmdArg) {
  return progressFlags.has(cmdArg)
}

/*@__NO_SIDE_EFFECTS__*/

/*@__NO_SIDE_EFFECTS__*/
function runBin(binPath, args, options) {
  return spawn(
    /*@__PURE__*/ require('./constants/exec-path'),
    [
      .../*@__PURE__*/ require('./constants/node-no-warnings-flags'),
      isPath(binPath) ? resolveBinPathSync(binPath) : whichBinSync(binPath),
      ...args
    ],
    options
  )
}

/*@__NO_SIDE_EFFECTS__*/
function runNpmScript(scriptName, args, options) {
  const { prepost, ...spawnOptions } = { __proto__: null, ...options }
  const useNodeRun =
    !prepost && /*@__PURE__*/ require('./constants/supports-node-run')
  return spawn(
    /*@__PURE__*/ require('./constants/exec-path'),
    [
      .../*@__PURE__*/ require('./constants/node-no-warnings-flags'),
      ...(useNodeRun
        ? ['--run']
        : [/*@__PURE__*/ require('./constants/npm-real-exec-path'), 'run']),
      scriptName,
      ...args
    ],
    {
      __proto__: null,
      ...spawnOptions
    }
  )
}

async function whichBin(binName, options) {
  const which = getWhich()
  // Depending on options `which` may throw if `binName` is not found.
  // The default behavior is to throw when `binName` is not found.
  return resolveBinPathSync(await which(binName, options))
}

function whichBinSync(binName, options) {
  // Depending on options `which` may throw if `binName` is not found.
  // The default behavior is to throw when `binName` is not found.
  return resolveBinPathSync(getWhich().sync(binName, options))
}

module.exports = {
  execNpm,
  isNpmAuditFlag,
  isNpmFundFlag,
  isNpmLoglevelFlag,
  isNpmNodeOptionsFlag,
  isNpmProgressFlag,
  resolveBinPathSync,
  runBin,
  runNpmScript,
  whichBin,
  whichBinSync
}
