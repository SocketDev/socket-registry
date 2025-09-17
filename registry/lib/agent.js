'use strict'

const {
  execBin,
  resolveBinPathSync,
  whichBin,
  whichBinSync
} = /*@__PURE__*/ require('./bin')
const { isDebug } = /*@__PURE__*/ require('./debug')
const { spawn } = /*@__PURE__*/ require('./spawn')

let _fs
/**
 * Lazily load the fs module to avoid Webpack errors.
 * @returns {import('fs')} The Node.js fs module.
 */
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

/**
 * Execute npm commands with optimized flags and settings.
 * @param {string[] | readonly string[]} args - Command arguments to pass to npm.
 * @param {import('./spawn').SpawnOptions} [options] - Spawn options.
 * @returns {Promise<{ stdout: string; stderr: string }>} Command output.
 */
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

/**
 * Execute pnpm commands with optimized flags and settings.
 * @param {string[] | readonly string[]} args - Command arguments to pass to pnpm.
 * @param {import('./spawn').SpawnOptions} [options] - Spawn options.
 * @returns {Promise<{ stdout: string; stderr: string }>} Command output.
 */
/*@__NO_SIDE_EFFECTS__*/
function execPnpm(args, options) {
  const useDebug = isDebug()
  const terminatorPos = args.indexOf('--')
  const pnpmArgs = (
    terminatorPos === -1 ? args : args.slice(0, terminatorPos)
  ).filter(a => !isNpmProgressFlag(a))
  const otherArgs = terminatorPos === -1 ? [] : args.slice(terminatorPos)

  const firstArg = pnpmArgs[0]
  // Commands that support --ignore-scripts flag:
  // Installation-related: install, add, update, remove, link, unlink, import, rebuild.
  const installationCommands = new Set([
    'install',
    'i',
    'add',
    'update',
    'up',
    'remove',
    'rm',
    'link',
    'ln',
    'unlink',
    'import',
    'rebuild',
    'rb'
  ])
  const supportsIgnoreScripts = installationCommands.has(firstArg)

  // pnpm uses --loglevel for all commands.
  const logLevelArgs =
    useDebug || pnpmArgs.some(isNpmLoglevelFlag) ? [] : ['--loglevel', 'warn']

  // Only add --ignore-scripts for commands that support it.
  const hasIgnoreScriptsFlag = pnpmArgs.some(isPnpmIgnoreScriptsFlag)
  const ignoreScriptsArgs =
    !supportsIgnoreScripts || hasIgnoreScriptsFlag ? [] : ['--ignore-scripts']

  // Note: pnpm doesn't have a --no-progress flag. It uses --reporter instead.
  // We removed --no-progress as it causes "Unknown option" errors with pnpm.

  return execBin(
    'pnpm',
    [
      // Add '--loglevel=warn' if a loglevel flag is not provided and debug is off.
      ...logLevelArgs,
      // Add '--ignore-scripts' by default for security (only for installation commands).
      ...ignoreScriptsArgs,
      ...pnpmArgs,
      ...otherArgs
    ],
    {
      __proto__: null,
      /**
       * Execute yarn commands with optimized flags and settings.
       * @param {string[] | readonly string[]} args - Command arguments to pass to yarn.
       * @param {import('./spawn').SpawnOptions} [options] - Spawn options.
       * @returns {Promise<{ stdout: string; stderr: string }>} Command output.
       */
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

  const firstArg = yarnArgs[0]
  // Commands that support --ignore-scripts flag in yarn:
  // Similar to npm/pnpm: installation-related commands.
  const installationCommands = new Set([
    'install',
    'add',
    'upgrade',
    'remove',
    'link',
    'unlink',
    'import'
  ])
  const supportsIgnoreScripts = installationCommands.has(firstArg)

  // Yarn uses --silent flag for quieter output.
  const logLevelArgs =
    useDebug || yarnArgs.some(isNpmLoglevelFlag) ? [] : ['--silent']

  // Only add --ignore-scripts for commands that support it.
  const hasIgnoreScriptsFlag = yarnArgs.some(isPnpmIgnoreScriptsFlag)
  const ignoreScriptsArgs =
    !supportsIgnoreScripts || hasIgnoreScriptsFlag ? [] : ['--ignore-scripts']

  return execBin(
    'yarn',
    [
      // Add '--silent' if a loglevel flag is not provided and debug is off.
      ...logLevelArgs,
      // Add '--ignore-scripts' by default for security (only for installation commands).
      ...ignoreScriptsArgs,
      ...yarnArgs,
      ...otherArgs
    ],
    {
      __proto__: null,
      /**
       * Check if a command argument is an npm audit flag.
       * @param {string} cmdArg - The command argument to check.
       * @returns {boolean} True if the argument is an audit flag.
       */
      ...options
    }
  )
}

/**
 * Check if a command argument is an npm fund flag.
 * @param {string} cmdArg - The command argument to check.
 * @returns {boolean} True if the argument is a fund flag.
 */
/*@__NO_SIDE_EFFECTS__*/
function isNpmAuditFlag(cmdArg) {
  return npmAuditFlags.has(cmdArg)
}

/**
 * Check if a command argument is an npm loglevel flag.
 * @param {string} cmdArg - The command argument to check.
 * @returns {boolean} True if the argument is a loglevel flag.
 */
/*@__NO_SIDE_EFFECTS__*/
function isNpmFundFlag(cmdArg) {
  return npmFundFlags.has(cmdArg)
}

/**
 * Check if a command argument is an npm loglevel flag.
 * @param {string} cmdArg - The command argument to check.
 * @returns {boolean} True if the argument is a loglevel flag.
 */
/*@__NO_SIDE_EFFECTS__*/
function isNpmLoglevelFlag(cmdArg) {
  // https://docs.npmjs.com/cli/v11/using-npm/logging#setting-log-levels
  return cmdArg.startsWith('--loglevel=') || npmLogFlags.has(cmdArg)
}

/**
 * Check if a command argument is an npm node-options flag.
 * @param {string} cmdArg - The command argument to check.
 * @returns {boolean} True if the argument is a node-options flag.
 */
/*@__NO_SIDE_EFFECTS__*/
function isNpmNodeOptionsFlag(cmdArg) {
  // https://docs.npmjs.com/cli/v9/using-npm/config#node-options
  return cmdArg.startsWith('--node-options=')
}

/**
 * Check if a command argument is an npm progress flag.
 * @param {string} cmdArg - The command argument to check.
 * @returns {boolean} True if the argument is a progress flag.
 */
/*@__NO_SIDE_EFFECTS__*/
function isNpmProgressFlag(cmdArg) {
  return npmProgressFlags.has(cmdArg)
}

/**
 * Check if a command argument is a pnpm ignore-scripts flag.
 * @param {string} cmdArg - The command argument to check.
 * @returns {boolean} True if the argument is an ignore-scripts flag.
 */
/*@__NO_SIDE_EFFECTS__*/
function isPnpmIgnoreScriptsFlag(cmdArg) {
  return pnpmIgnoreScriptsFlags.has(cmdArg)
}

/**
 * Execute a package.json script using the appropriate package manager.
 * Automatically detects pnpm, yarn, or npm based on lockfiles.
 * @param {string} scriptName - The name of the script to run.
 * @param {string[] | readonly string[]} args - Additional arguments to pass to the script.
 * @param {ExecScriptOptions} [options] - Spawn options with optional prepost flag.
 * @returns {Promise<{ stdout: string; stderr: string }>} Command output.
 * @typedef {import('./objects').Remap<import('./spawn').SpawnOptions & {prepost?: boolean}>} ExecScriptOptions
 */
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
  execBin,
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
  whichBin,
  whichBinSync
}
