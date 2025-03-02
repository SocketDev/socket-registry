'use strict'

const constants = require('./constants')
const { isDebug } = require('./debug')
const { spawn } = require('./spawn')

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

function execNpm(args, options) {
  const terminatorPos = args.indexOf('--')
  const npmArgs = (
    terminatorPos === -1 ? args : args.slice(0, terminatorPos)
  ).filter(a => !isAuditFlag(a) && !isFundFlag(a) && !isProgressFlag(a))
  const otherArgs = terminatorPos === -1 ? [] : args.slice(terminatorPos)
  const useDebug = isDebug()
  const isSilent = !useDebug && !npmArgs.some(isLoglevelFlag)
  return spawn(
    // Lazily access constants.npmExecPath.
    constants.npmExecPath,
    [
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
      ...(isSilent ? ['--loglevel', 'error'] : []),
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

function isAuditFlag(cmdArg) {
  return auditFlags.has(cmdArg)
}

function isFundFlag(cmdArg) {
  return fundFlags.has(cmdArg)
}

function isLoglevelFlag(cmdArg) {
  // https://docs.npmjs.com/cli/v11/using-npm/logging#setting-log-levels
  return cmdArg.startsWith('--loglevel=') || logFlags.has(cmdArg)
}

function isProgressFlag(cmdArg) {
  return progressFlags.has(cmdArg)
}

function runBin(binPath, args, options) {
  // Lazily access constants.WIN32.
  const { WIN32 } = constants
  return spawn(
    // Lazily access constants.execPath.
    WIN32 ? binPath : constants.execPath,
    [
      ...(WIN32
        ? []
        : [
            // Lazily access constants.nodeNoWarningsFlags.
            ...constants.nodeNoWarningsFlags,
            binPath
          ]),
      ...args
    ],
    {
      __proto__: null,
      ...options,
      shell: true
    }
  )
}

function runScript(scriptName, args, options) {
  const { prepost, ...spawnOptions } = { __proto__: null, ...options }
  // Lazily access constants.SUPPORTS_NODE_RUN.
  const useNodeRun = !prepost && constants.SUPPORTS_NODE_RUN
  // Lazily access constants.execPath and constants.npmExecPath.
  const cmd = useNodeRun ? constants.execPath : constants.npmExecPath
  return spawn(
    cmd,
    [
      ...(useNodeRun
        ? [
            // Lazily access constants.nodeNoWarningsFlags.
            ...constants.nodeNoWarningsFlags,
            '--run'
          ]
        : ['run']),
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

module.exports = {
  execNpm,
  isAuditFlag,
  isFundFlag,
  isLoglevelFlag,
  isProgressFlag,
  runBin,
  runScript
}
