/**
 * @fileoverview Child process spawning utilities with cross-platform support.
 * Provides enhanced spawn functionality with stdio handling and error management.
 *
 * SECURITY: Array-Based Arguments Prevent Command Injection
 *
 * This module uses array-based arguments for all command execution, which is the
 * PRIMARY DEFENSE against command injection attacks. When you pass arguments as
 * an array to spawn():
 *
 *   spawn('npx', ['sfw', tool, ...args], { shell: true })
 *
 * Node.js handles escaping automatically. Each argument is passed directly to the
 * OS without shell interpretation. Shell metacharacters like ; | & $ ( ) ` are
 * treated as LITERAL STRINGS, not as commands. This approach is secure even when
 * shell: true is used on Windows for .cmd/.bat file resolution.
 *
 * UNSAFE ALTERNATIVE (not used in this codebase):
 *   spawn(`npx sfw ${tool} ${args.join(' ')}`, { shell: true })  // ✖ VULNERABLE
 *
 * String concatenation allows injection. For example, if tool = "foo; rm -rf /",
 * the shell would execute both commands. Array-based arguments prevent this.
 *
 * References:
 * - https://nodejs.org/api/child_process.html#child_processspawncommand-args-options
 * - https://cheatsheetseries.owasp.org/cheatsheets/Nodejs_Security_Cheat_Sheet.html
 */

import { isArray } from './arrays'
import abortSignal from './constants/abort-signal'
import spinner from './constants/spinner'
import { getPromiseSpawn } from './dependencies/system'
import { getOwn, hasOwn } from './objects'
import { stripAnsi } from './strings'

// Define BufferEncoding type for TypeScript compatibility.
type BufferEncoding = globalThis.BufferEncoding

const windowsScriptExtRegExp = /\.(?:cmd|bat|ps1)$/i

let _child_process: typeof import('node:child_process') | undefined
/**
 * Lazily load the child_process module.
 */
/*@__NO_SIDE_EFFECTS__*/
function getChildProcess() {
  if (_child_process === undefined) {
    // Use non-'node:' prefixed require to avoid Webpack errors.
    // eslint-disable-next-line n/prefer-node-protocol
    _child_process = /*@__PURE__*/ require('child_process')
  }
  return _child_process!
}

// Type for promise-spawn options.
export type PromiseSpawnOptions = {
  cwd?: string | undefined
  stdioString?: boolean | undefined
  stdio?: StdioType | undefined
  env?: NodeJS.ProcessEnv | undefined
  shell?: boolean | string | undefined
  signal?: AbortSignal | undefined
  timeout?: number | undefined
  uid?: number | undefined
  gid?: number | undefined
}

// Type for promise-spawn result.
export type PromiseSpawnResult = Promise<{
  cmd: string
  args: string[] | readonly string[]
  code: number
  signal: NodeJS.Signals | null
  stdout: string | Buffer
  stderr: string | Buffer
}> & {
  process: ChildProcessType
  stdin: WritableStreamType | null
}

let _npmCliPromiseSpawn:
  | ((
      cmd: string,
      args: string[],
      options?: PromiseSpawnOptions | undefined,
      extra?: SpawnExtra | undefined,
    ) => PromiseSpawnResult)
  | undefined
/**
 * Lazily load the promise-spawn module for async process spawning.
 */
/*@__NO_SIDE_EFFECTS__*/
function getNpmcliPromiseSpawn() {
  if (_npmCliPromiseSpawn === undefined) {
    _npmCliPromiseSpawn = /*@__PURE__*/ getPromiseSpawn() as any
  }
  return _npmCliPromiseSpawn!
}

let _path: typeof import('node:path') | undefined
/**
 * Lazily load the path module to avoid Webpack errors.
 */
/*@__NO_SIDE_EFFECTS__*/
function getPath() {
  if (_path === undefined) {
    // Use non-'node:' prefixed require to avoid Webpack errors.
    // eslint-disable-next-line n/prefer-node-protocol
    _path = /*@__PURE__*/ require('path')
  }
  return _path!
}

/**
 * Check if a value is a spawn error.
 */
export type SpawnError = {
  args: string[]
  cmd: string
  code: number
  name: string
  message: string
  signal: NodeJS.Signals | null
  stack: string
  stderr: string | Buffer
  stdout: string | Buffer
}

export type SpawnErrorWithOutputString = SpawnError & {
  stdout: string
  stderr: string
}

export type SpawnErrorWithOutputBuffer = SpawnError & {
  stdout: Buffer
  stderr: Buffer
}

export type SpawnExtra = Record<any, any>

export type IOType = 'pipe' | 'ignore' | 'inherit' | 'overlapped'
export type StdioType = IOType | 'ipc' | Array<IOType | 'ipc'>

export interface SpawnSyncReturns<T> {
  pid: number
  output: Array<T | null>
  stdout: T
  stderr: T
  status: number | null
  signal: NodeJS.Signals | null
  error?: Error | undefined
}

/**
 * Check if a value is a spawn error with expected properties.
 */
/*@__NO_SIDE_EFFECTS__*/
export function isSpawnError(value: unknown): value is SpawnError {
  if (value === null || typeof value !== 'object') {
    return false
  }
  // Check for spawn-specific error properties.
  const err = value as any
  return (
    (hasOwn(err, 'code') && typeof err.code !== 'undefined') ||
    (hasOwn(err, 'errno') && typeof err.errno !== 'undefined') ||
    (hasOwn(err, 'syscall') && typeof err.syscall === 'string')
  )
}

/**
 * Check if stdio configuration matches a specific type.
 */
/*@__NO_SIDE_EFFECTS__*/
export function isStdioType(
  stdio: string | string[],
  type?: StdioType | undefined,
): boolean {
  // If called with one argument, check if it's a valid stdio type.
  if (arguments.length === 1) {
    const validTypes = ['pipe', 'ignore', 'inherit', 'overlapped']
    return typeof stdio === 'string' && validTypes.includes(stdio)
  }
  // Original two-argument behavior.
  return (
    stdio === type ||
    ((stdio === null || stdio === undefined) && type === 'pipe') ||
    (isArray(stdio) &&
      stdio.length > 2 &&
      stdio[0] === type &&
      stdio[1] === type &&
      stdio[2] === type)
  )
}

/**
 * Strip ANSI escape codes from spawn result stdout and stderr.
 */
/*@__NO_SIDE_EFFECTS__*/
function stripAnsiFromSpawnResult(result: any): any {
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
// Duplicated from Node.js child_process.SpawnOptions
// These are the options passed to child_process.spawn()
interface NodeSpawnOptions {
  cwd?: string | URL | undefined
  env?: NodeJS.ProcessEnv | undefined
  argv0?: string | undefined
  stdio?: any
  detached?: boolean | undefined
  uid?: number | undefined
  gid?: number | undefined
  serialization?: 'json' | 'advanced' | undefined
  shell?: boolean | string | undefined
  windowsVerbatimArguments?: boolean | undefined
  windowsHide?: boolean | undefined
  signal?: AbortSignal | undefined
  timeout?: number | undefined
  killSignal?: NodeJS.Signals | number | undefined
}

// Duplicated from Node.js child_process.ChildProcess
// This represents a spawned child process
interface ChildProcessType {
  stdin: NodeJS.WritableStream | null
  stdout: NodeJS.ReadableStream | null
  stderr: NodeJS.ReadableStream | null
  readonly channel?: any
  readonly stdio: [
    NodeJS.WritableStream | null,
    NodeJS.ReadableStream | null,
    NodeJS.ReadableStream | null,
    NodeJS.ReadableStream | NodeJS.WritableStream | null | undefined,
    NodeJS.ReadableStream | NodeJS.WritableStream | null | undefined,
  ]
  readonly killed: boolean
  readonly pid?: number | undefined
  readonly connected: boolean
  readonly exitCode: number | null
  readonly signalCode: NodeJS.Signals | null
  readonly spawnargs: string[]
  readonly spawnfile: string
  kill(signal?: NodeJS.Signals | number): boolean
  send(message: any, callback?: (error: Error | null) => void): boolean
  send(
    message: any,
    sendHandle?: any | undefined,
    callback?: (error: Error | null) => void,
  ): boolean
  send(
    message: any,
    sendHandle?: any | undefined,
    options?: any | undefined,
    callback?: (error: Error | null) => void,
  ): boolean
  disconnect(): void
  unref(): void
  ref(): void
}

// Duplicated from Node.js stream.Writable
interface WritableStreamType {
  writable: boolean
  writableEnded: boolean
  writableFinished: boolean
  writableHighWaterMark: number
  writableLength: number
  writableObjectMode: boolean
  writableCorked: number
  destroyed: boolean
  write(
    chunk: any,
    encoding?: BufferEncoding | undefined,
    callback?: (error?: Error | null) => void,
  ): boolean
  write(chunk: any, callback?: (error?: Error | null) => void): boolean
  end(cb?: () => void): this
  end(chunk: any, cb?: () => void): this
  end(chunk: any, encoding?: BufferEncoding | undefined, cb?: () => void): this
  cork(): void
  uncork(): void
  destroy(error?: Error | undefined): this
}

/**
 * Spawn a child process with enhanced error handling and output capture.
 */
export type SpawnOptions = import('./objects').Remap<
  NodeSpawnOptions & {
    spinner?: import('./spinner').Spinner | undefined
    stdioString?: boolean
    stripAnsi?: boolean
  }
>
export type SpawnResult = PromiseSpawnResult
export type SpawnStdioResult = {
  cmd: string
  args: string[] | readonly string[]
  code: number
  signal: NodeJS.Signals | null
  stdout: string | Buffer
  stderr: string | Buffer
}

/**
 * Spawn a child process and return a promise that resolves when it completes.
 *
 * SECURITY: This function uses array-based arguments which prevent command injection.
 * Arguments in the `args` array are passed directly to the OS without shell
 * interpretation. Shell metacharacters (;|&$()`) are treated as literal strings,
 * not as commands or operators. This is the PRIMARY SECURITY DEFENSE.
 *
 * Even when shell: true is used (on Windows for .cmd/.bat execution), the array-based
 * approach remains secure because Node.js properly escapes each argument before passing
 * to the shell.
 *
 * @param cmd - Command to execute (not user-controlled)
 * @param args - Array of arguments (safe even with user input due to array-based passing)
 * @param options - Spawn options
 * @param extra - Extra options for promise-spawn
 *
 * @example
 * // ✔ DO THIS - Array-based arguments
 * spawn('git', ['commit', '-m', userMessage])
 * // Each argument is properly escaped, even if userMessage = "foo; rm -rf /"
 *
 * @example
 * // ✖ NEVER DO THIS - String concatenation
 * spawn(`git commit -m "${userMessage}"`, { shell: true })
 * // Vulnerable to injection if userMessage = '"; rm -rf / #'
 */
export function spawn(
  cmd: string,
  args?: string[] | readonly string[],
  options?: SpawnOptions | undefined,
  extra?: SpawnExtra | undefined,
): SpawnResult {
  // Windows cmd.exe command resolution for .cmd/.bat/.ps1 files:
  //
  // When shell: true is used on Windows with script files (.cmd, .bat, .ps1),
  // cmd.exe can have issues executing full paths. The solution is to use just
  // the command basename without extension and let cmd.exe find it via PATH.
  //
  // How cmd.exe resolves commands:
  // 1. Searches current directory first
  // 2. Then searches each directory in PATH environment variable
  // 3. For each directory, tries extensions from PATHEXT (.COM, .EXE, .BAT, .CMD, etc.)
  // 4. Executes the first match found
  //
  // Example: Given 'C:\pnpm\pnpm.cmd' with shell: true
  // 1. Extract basename without extension: 'pnpm'
  // 2. cmd.exe searches PATH directories for 'pnpm'
  // 3. PATHEXT causes it to try 'pnpm.com', 'pnpm.exe', 'pnpm.bat', 'pnpm.cmd', etc.
  // 4. Finds and executes 'C:\pnpm\pnpm.cmd'
  //
  // This approach is consistent with how other tools handle Windows execution:
  // - npm's promise-spawn: uses which.sync() to find commands in PATH
  // - cross-spawn: spawns cmd.exe with escaped arguments
  // - execa: uses cross-spawn under the hood for Windows support
  //
  // See: https://github.com/nodejs/node/issues/3675
  const shell = getOwn(options, 'shell')
  const WIN32 = require('./constants/WIN32')
  if (WIN32 && shell && windowsScriptExtRegExp.test(cmd)) {
    const path = getPath()
    // Extract just the command name without path and extension.
    cmd = path.basename(cmd, path.extname(cmd))
  }
  const {
    spinner: optionsSpinner = spinner,
    stripAnsi: shouldStripAnsi = true,
    ...spawnOptions
  } = { __proto__: null, ...options } as SpawnOptions
  const spinnerInstance = optionsSpinner
  const { env, stdio, stdioString = true } = spawnOptions
  // The stdio option can be a string or an array.
  // https://nodejs.org/api/child_process.html#optionsstdio
  const wasSpinning = !!spinnerInstance?.isSpinning
  const shouldStopSpinner =
    wasSpinning && !isStdioType(stdio, 'ignore') && !isStdioType(stdio, 'pipe')
  const shouldRestartSpinner = shouldStopSpinner
  if (shouldStopSpinner) {
    spinnerInstance.stop()
  }
  const npmCliPromiseSpawn = getNpmcliPromiseSpawn()
  // Use __proto__: null to prevent prototype pollution when passing to
  // third-party code, Node.js built-ins, or JavaScript built-in methods.
  // https://github.com/npm/promise-spawn
  // https://github.com/nodejs/node/blob/v24.0.1/lib/child_process.js#L674-L678
  const promiseSpawnOpts = {
    __proto__: null,
    cwd: typeof spawnOptions.cwd === 'string' ? spawnOptions.cwd : undefined,
    env: {
      __proto__: null,
      ...process.env,
      ...env,
    } as unknown as NodeJS.ProcessEnv,
    signal: abortSignal,
    stdio: spawnOptions.stdio,
    stdioString,
    shell: spawnOptions.shell,
    timeout: spawnOptions.timeout,
    uid: spawnOptions.uid,
    gid: spawnOptions.gid,
  } as unknown as PromiseSpawnOptions
  const spawnPromise = npmCliPromiseSpawn(
    cmd,
    args ? [...args] : [],
    promiseSpawnOpts,
    extra,
  )
  const oldSpawnPromise = spawnPromise
  let newSpawnPromise: any
  if (shouldStripAnsi && stdioString) {
    newSpawnPromise = spawnPromise
      .then(result => {
        result = stripAnsiFromSpawnResult(result)
        // Add exitCode as an alias for code.
        if ('code' in result) {
          ;(result as any)['exitCode'] = result.code
        }
        return result
      })
      .catch(error => {
        throw stripAnsiFromSpawnResult(error)
      })
  } else {
    newSpawnPromise = spawnPromise.then(result => {
      // Add exitCode as an alias for code.
      if ('code' in result) {
        ;(result as any)['exitCode'] = result.code
      }
      return result
    })
  }
  if (shouldRestartSpinner) {
    newSpawnPromise = newSpawnPromise.finally(() => {
      spinnerInstance.start()
    })
  }
  // Copy process and stdin properties from original promise
  newSpawnPromise.process = oldSpawnPromise.process
  newSpawnPromise.stdin = oldSpawnPromise.stdin
  return newSpawnPromise as SpawnResult
}

/*@__NO_SIDE_EFFECTS__*/
/**
 * Synchronously spawn a child process.
 */
export type SpawnSyncOptions = Omit<SpawnOptions, 'spinner'>
export function spawnSync(
  cmd: string,
  args?: string[] | readonly string[],
  options?: SpawnSyncOptions | undefined,
): SpawnSyncReturns<string | Buffer> {
  // Windows cmd.exe command resolution for .cmd/.bat/.ps1 files:
  // See spawn() function above for detailed explanation of this approach.
  const shell = getOwn(options, 'shell')
  const WIN32 = require('./constants/WIN32')
  if (WIN32 && shell && windowsScriptExtRegExp.test(cmd)) {
    const path = getPath()
    // Extract just the command name without path and extension.
    cmd = path.basename(cmd, path.extname(cmd))
  }
  const { stripAnsi: shouldStripAnsi = true, ...rawSpawnOptions } = {
    __proto__: null,
    ...options,
  } as SpawnSyncOptions
  const { stdioString: rawStdioString = true } = rawSpawnOptions
  const rawEncoding = rawStdioString ? 'utf8' : 'buffer'
  const spawnOptions: any = {
    encoding: rawEncoding,
    ...rawSpawnOptions,
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
