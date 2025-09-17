'use strict'

const {
  resolveBinPathSync,
  runBin,
  whichBin,
  whichBinSync
} = /*@__PURE__*/ require('./bin')
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

let _path
/*@__NO_SIDE_EFFECTS__*/
function getPath() {
  if (_path === undefined) {
    // Use non-'node:' prefixed require to avoid Webpack errors.
    // eslint-disable-next-line n/prefer-node-protocol
    _path = /*@__PURE__*/ require('path')
  }
  return _path
}

const npmAuditFlags = new Set(['--audit', '--no-audit'])

const npmFundFlags = new Set(['--fund', '--no-fund'])

const npmLogFlags = new Set([
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

const npmProgressFlags = new Set(['--progress', '--no-progress'])

const pnpmIgnoreScriptsFlags = new Set([
  '--ignore-scripts',
  '--no-ignore-scripts'
])

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
function execPnpm(args, options) {
  const useDebug = isDebug()
  const terminatorPos = args.indexOf('--')
  const pnpmArgs = (
    terminatorPos === -1 ? args : args.slice(0, terminatorPos)
  ).filter(a => !isNpmProgressFlag(a))
  const otherArgs = terminatorPos === -1 ? [] : args.slice(terminatorPos)
  const logLevelArgs =
    // pnpm uses similar loglevel settings as npm
    useDebug || pnpmArgs.some(isNpmLoglevelFlag) ? [] : ['--loglevel', 'warn']
  // Check if --ignore-scripts or --no-ignore-scripts is already present
  const hasIgnoreScriptsFlag = pnpmArgs.some(isPnpmIgnoreScriptsFlag)
  const ignoreScriptsArgs = hasIgnoreScriptsFlag ? [] : ['--ignore-scripts']

  return runBin(
    'pnpm',
    [
      // Add `--no-progress` to fix input being swallowed by the spinner
      '--no-progress',
      // Add '--loglevel=warn' if a loglevel flag is not provided and debug is off
      ...logLevelArgs,
      // Add '--ignore-scripts' by default for security unless explicitly disabled
      ...ignoreScriptsArgs,
      ...pnpmArgs,
      ...otherArgs
    ],
    {
      __proto__: null,
      ...options
    }
  )
}

/*@__NO_SIDE_EFFECTS__*/
function execYarn(args, options) {
  const useDebug = isDebug()
  const terminatorPos = args.indexOf('--')
  const yarnArgs = (
    terminatorPos === -1 ? args : args.slice(0, terminatorPos)
  ).filter(a => !isNpmProgressFlag(a))
  const otherArgs = terminatorPos === -1 ? [] : args.slice(terminatorPos)
  // Yarn uses --silent flag for quieter output
  const logLevelArgs =
    useDebug || yarnArgs.some(isNpmLoglevelFlag) ? [] : ['--silent']
  // Check if --ignore-scripts is already present
  const hasIgnoreScriptsFlag = yarnArgs.some(isPnpmIgnoreScriptsFlag)
  const ignoreScriptsArgs = hasIgnoreScriptsFlag ? [] : ['--ignore-scripts']

  return runBin(
    'yarn',
    [
      // Add '--silent' if a loglevel flag is not provided and debug is off
      ...logLevelArgs,
      // Add '--ignore-scripts' by default for security unless explicitly disabled
      ...ignoreScriptsArgs,
      ...yarnArgs,
      ...otherArgs
    ],
    {
      __proto__: null,
      ...options
    }
  )
}

/*@__NO_SIDE_EFFECTS__*/
function isNpmAuditFlag(cmdArg) {
  return npmAuditFlags.has(cmdArg)
}

/*@__NO_SIDE_EFFECTS__*/
function isNpmFundFlag(cmdArg) {
  return npmFundFlags.has(cmdArg)
}

/*@__NO_SIDE_EFFECTS__*/
function isNpmLoglevelFlag(cmdArg) {
  // https://docs.npmjs.com/cli/v11/using-npm/logging#setting-log-levels
  return cmdArg.startsWith('--loglevel=') || npmLogFlags.has(cmdArg)
}

/*@__NO_SIDE_EFFECTS__*/
function isNpmNodeOptionsFlag(cmdArg) {
  // https://docs.npmjs.com/cli/v9/using-npm/config#node-options
  return cmdArg.startsWith('--node-options=')
}

/*@__NO_SIDE_EFFECTS__*/
function isNpmProgressFlag(cmdArg) {
  return npmProgressFlags.has(cmdArg)
}

/*@__NO_SIDE_EFFECTS__*/
function isPnpmIgnoreScriptsFlag(cmdArg) {
  return pnpmIgnoreScriptsFlags.has(cmdArg)
}

/*@__NO_SIDE_EFFECTS__*/
function execScript(scriptName, args, options) {
  const { prepost, ...spawnOptions } = { __proto__: null, ...options }
  const useNodeRun =
    !prepost && /*@__PURE__*/ require('./constants/supports-node-run')

  // Detect package manager based on lockfile in the current package.
  // Only check the immediate directory with package.json, not parents.
  const fs = getFs()
  const path = getPath()
  const cwd = spawnOptions.cwd || process.cwd()

  // Check for pnpm-lock.yaml in the same directory as package.json.
  const PNPM_LOCK_YAML = /*@__PURE__*/ require('./constants/pnpm-lock-yaml')
  const usePnpm = fs.existsSync(path.join(cwd, PNPM_LOCK_YAML))

  if (usePnpm) {
    return execPnpm(['run', scriptName, ...args], spawnOptions)
  }

  // Check for yarn.lock in the same directory as package.json.
  const YARN_LOCK = /*@__PURE__*/ require('./constants/yarn-lock')
  const useYarn = fs.existsSync(path.join(cwd, YARN_LOCK))

  if (useYarn) {
    return execYarn(['run', scriptName, ...args], spawnOptions)
  }

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

module.exports = {
  execNpm,
  execPnpm,
  execScript,
  execYarn,
  isNpmAuditFlag,
  isNpmFundFlag,
  isNpmLoglevelFlag,
  isNpmNodeOptionsFlag,
  isNpmProgressFlag,
  isPnpmIgnoreScriptsFlag,
  resolveBinPathSync,
  runBin,
  whichBin,
  whichBinSync
}
