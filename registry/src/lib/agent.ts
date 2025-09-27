/**
 * @fileoverview Package manager agent for executing npm, pnpm, and yarn commands.
 * Provides cross-platform utilities with optimized flags and security defaults.
 */
'use strict'

const {
  execBin,
  resolveBinPathSync,
  whichBin,
  whichBinSync,
} = /*@__PURE__*/ require('./bin')
const { isDebug } = /*@__PURE__*/ require('./debug')
const { findUpSync } = /*@__PURE__*/ require('./fs')
const { getOwn } = /*@__PURE__*/ require('./objects')
const { spawn } = /*@__PURE__*/ require('./spawn')

// Note: npm flag checking is done with regex patterns in the is*Flag functions below.

const pnpmIgnoreScriptsFlags = new Set([
  '--ignore-scripts',
  '--no-ignore-scripts',
])

const pnpmFrozenLockfileFlags = new Set([
  '--frozen-lockfile',
  '--no-frozen-lockfile',
])

const pnpmInstallCommands = new Set(['install', 'i'])

// Commands that support --ignore-scripts flag in pnpm:
// Installation-related: install, add, update, remove, link, unlink, import, rebuild.
const pnpmInstallLikeCommands = new Set([
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
  'rb',
])

// Commands that support --ignore-scripts flag in yarn:
// Similar to npm/pnpm: installation-related commands.
const yarnInstallLikeCommands = new Set([
  'install',
  'add',
  'upgrade',
  'remove',
  'link',
  'unlink',
  'import',
])

/**
 * Execute npm commands with optimized flags and settings.
 */
/*@__NO_SIDE_EFFECTS__*/
function execNpm(args, options) {
  const useDebug = isDebug()
  const terminatorPos = args.indexOf('--')
  const npmArgs = (
    terminatorPos === -1 ? args : args.slice(0, terminatorPos)
  ).filter(
    a => !isNpmAuditFlag(a) && !isNpmFundFlag(a) && !isNpmProgressFlag(a),
  )
  const otherArgs = terminatorPos === -1 ? [] : args.slice(terminatorPos)
  const logLevelArgs =
    // The default value of loglevel is "notice". We default to "warn" which is
    // one level quieter.
    useDebug || npmArgs.some(isNpmLoglevelFlag) ? [] : ['--loglevel', 'warn']
  return spawn(
    /*@__PURE__*/ require('./constants/EXEC_PATH'),
    [
      .../*@__PURE__*/ require('./constants/NODE_HARDEN_FLAGS'),
      .../*@__PURE__*/ require('./constants/NODE_NO_WARNINGS_FLAGS'),
      /*@__PURE__*/ require('./constants/NPM_REAL_EXEC_PATH'),
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
      ...otherArgs,
    ],
    {
      __proto__: null,
      ...options,
    },
  )
}

/**
 * Execute pnpm commands with optimized flags and settings.
 */
/*@__NO_SIDE_EFFECTS__*/
function execPnpm(args, options) {
  const { allowLockfileUpdate, ...extBinOpts } = { __proto__: null, ...options }
  const useDebug = isDebug()
  const terminatorPos = args.indexOf('--')
  const pnpmArgs = (
    terminatorPos === -1 ? args : args.slice(0, terminatorPos)
  ).filter(a => !isNpmProgressFlag(a))
  const otherArgs = terminatorPos === -1 ? [] : args.slice(terminatorPos)

  const firstArg = pnpmArgs[0]
  const supportsIgnoreScripts = pnpmInstallLikeCommands.has(firstArg)

  // pnpm uses --loglevel for all commands.
  const logLevelArgs =
    useDebug || pnpmArgs.some(isPnpmLoglevelFlag) ? [] : ['--loglevel', 'warn']

  // Only add --ignore-scripts for commands that support it.
  const hasIgnoreScriptsFlag = pnpmArgs.some(isPnpmIgnoreScriptsFlag)
  const ignoreScriptsArgs =
    !supportsIgnoreScripts || hasIgnoreScriptsFlag ? [] : ['--ignore-scripts']

  // In CI environments, pnpm uses --frozen-lockfile by default which prevents lockfile updates.
  // For commands that need to update the lockfile (like install with new packages/overrides),
  // we need to explicitly add --no-frozen-lockfile in CI mode if not already present.
  const ENV = /*@__PURE__*/ require('./constants/ENV')
  const frozenLockfileArgs = []
  if (
    ENV.CI &&
    allowLockfileUpdate &&
    isPnpmInstallCommand(firstArg) &&
    !pnpmArgs.some(isPnpmFrozenLockfileFlag)
  ) {
    frozenLockfileArgs.push('--no-frozen-lockfile')
  }

  // Note: pnpm doesn't have a --no-progress flag. It uses --reporter instead.
  // We removed --no-progress as it causes "Unknown option" errors with pnpm.

  return execBin(
    'pnpm',
    [
      // Add '--loglevel=warn' if a loglevel flag is not provided and debug is off.
      ...logLevelArgs,
      // Add '--ignore-scripts' by default for security (only for installation commands).
      ...ignoreScriptsArgs,
      // Add '--no-frozen-lockfile' in CI when lockfile updates are needed.
      ...frozenLockfileArgs,
      ...pnpmArgs,
      ...otherArgs,
    ],
    extBinOpts,
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
  const supportsIgnoreScripts = yarnInstallLikeCommands.has(firstArg)

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
      ...otherArgs,
    ],
    {
      __proto__: null,
      /**
       * Check if a command argument is an npm audit flag.
       */
      ...options,
    },
  )
}

/**
 * Check if a command argument is an npm audit flag.
 */
/*@__NO_SIDE_EFFECTS__*/
function isNpmAuditFlag(cmdArg) {
  return /^--(no-)?audit(=.*)?$/.test(cmdArg)
}

/**
 * Check if a command argument is an npm fund flag.
 */
/*@__NO_SIDE_EFFECTS__*/
function isNpmFundFlag(cmdArg) {
  return /^--(no-)?fund(=.*)?$/.test(cmdArg)
}

/**
 * Check if a command argument is an npm loglevel flag.
 */
/*@__NO_SIDE_EFFECTS__*/
function isNpmLoglevelFlag(cmdArg) {
  // https://docs.npmjs.com/cli/v11/using-npm/logging#setting-log-levels
  if (/^--loglevel(=.*)?$/.test(cmdArg)) {
    return true
  }
  // Check for long form flags
  if (/^--(silent|verbose|info|warn|error|quiet)$/.test(cmdArg)) {
    return true
  }
  // Check for shorthand flags
  return /^-(s|q|d|dd|ddd|v)$/.test(cmdArg)
}

/**
 * Check if a command argument is an npm node-options flag.
 */
/*@__NO_SIDE_EFFECTS__*/
function isNpmNodeOptionsFlag(cmdArg) {
  // https://docs.npmjs.com/cli/v9/using-npm/config#node-options
  return /^--node-options(=.*)?$/.test(cmdArg)
}

/**
 * Check if a command argument is an npm progress flag.
 */
/*@__NO_SIDE_EFFECTS__*/
function isNpmProgressFlag(cmdArg) {
  return /^--(no-)?progress(=.*)?$/.test(cmdArg)
}

/**
 * Check if a command argument is a pnpm ignore-scripts flag.
 */
/*@__NO_SIDE_EFFECTS__*/
function isPnpmIgnoreScriptsFlag(cmdArg) {
  return pnpmIgnoreScriptsFlags.has(cmdArg)
}

/**
 * Check if a command argument is a pnpm frozen-lockfile flag.
 */
/*@__NO_SIDE_EFFECTS__*/
function isPnpmFrozenLockfileFlag(cmdArg) {
  return pnpmFrozenLockfileFlags.has(cmdArg)
}

/**
 * Check if a command argument is a pnpm install command.
 */
/*@__NO_SIDE_EFFECTS__*/
function isPnpmInstallCommand(cmdArg) {
  return pnpmInstallCommands.has(cmdArg)
}

/**
 * Alias for isNpmLoglevelFlag for pnpm usage.
 */
const isPnpmLoglevelFlag = isNpmLoglevelFlag

/**
 * Execute a package.json script using the appropriate package manager.
 * Automatically detects pnpm, yarn, or npm based on lockfiles.
 * @typedef {import('./objects').Remap<import('./spawn').SpawnOptions & {prepost?: boolean}>} ExecScriptOptions
 */
/*@__NO_SIDE_EFFECTS__*/
function execScript(scriptName, args, options) {
  // Handle overloaded signatures: execScript(name, options) or execScript(name, args, options).
  if (!Array.isArray(args) && typeof args === 'object') {
    options = args
    args = []
  }
  args = args || []
  const { prepost, ...spawnOptions } = { __proto__: null, ...options }

  // If shell: true is passed, run the command directly as a shell command.
  if (spawnOptions.shell === true) {
    return spawn(scriptName, args, spawnOptions)
  }

  const useNodeRun =
    !prepost && /*@__PURE__*/ require('./constants/SUPPORTS_NODE_RUN')

  // Detect package manager based on lockfile by traversing up from current directory.
  const cwd = getOwn(spawnOptions, 'cwd') ?? process.cwd()

  // Check for pnpm-lock.yaml.
  const PNPM_LOCK_YAML = /*@__PURE__*/ require('./constants/PNPM_LOCK_YAML')
  const pnpmLockPath = findUpSync(PNPM_LOCK_YAML, { cwd })
  if (pnpmLockPath) {
    return execPnpm(['run', scriptName, ...args], spawnOptions)
  }

  // Check for package-lock.json.
  // When in an npm workspace, use npm run to ensure workspace binaries are available.
  const PACKAGE_LOCK = /*@__PURE__*/ require('./constants/PACKAGE_LOCK_JSON')
  const packageLockPath = findUpSync(PACKAGE_LOCK, { cwd })
  if (packageLockPath) {
    return execNpm(['run', scriptName, ...args], spawnOptions)
  }

  // Check for yarn.lock.
  const YARN_LOCK = /*@__PURE__*/ require('./constants/YARN_LOCK')
  const yarnLockPath = findUpSync(YARN_LOCK, { cwd })
  if (yarnLockPath) {
    return execYarn(['run', scriptName, ...args], spawnOptions)
  }

  return spawn(
    /*@__PURE__*/ require('./constants/EXEC_PATH'),
    [
      .../*@__PURE__*/ require('./constants/NODE_NO_WARNINGS_FLAGS'),
      ...(useNodeRun
        ? ['--run']
        : [/*@__PURE__*/ require('./constants/NPM_REAL_EXEC_PATH'), 'run']),
      scriptName,
      ...args,
    ],
    {
      __proto__: null,
      ...spawnOptions,
    },
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
  isPnpmFrozenLockfileFlag,
  isPnpmIgnoreScriptsFlag,
  isPnpmInstallCommand,
  isPnpmLoglevelFlag,
  resolveBinPathSync,
  whichBin,
  whichBinSync,
}
