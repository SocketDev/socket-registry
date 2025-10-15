/**
 * @fileoverview Console logging utilities with line prefix support.
 * Provides enhanced console methods with formatted output capabilities.
 */

import isUnicodeSupported from '../external/@socketregistry/is-unicode-supported'
import yoctocolorsCjs from '../external/yoctocolors-cjs'
import { objectAssign, objectFreeze } from './objects'
import { applyLinePrefix, isBlankString } from './strings'

// Type definitions
type LogSymbols = {
  fail: string
  info: string
  success: string
  warn: string
}

type LoggerMethods = {
  [K in keyof typeof console]: (typeof console)[K] extends (
    ...args: infer A
    // biome-ignore lint/suspicious/noExplicitAny: Console method return types are dynamic.
  ) => any
    ? (...args: A) => Logger
    : (typeof console)[K]
}

interface Task {
  run<T>(f: () => T): T
}

export type { LogSymbols, LoggerMethods, Task }

const globalConsole = console
// IMPORTANT: Do not use destructuring here - use direct assignment instead.
// tsgo has a bug that incorrectly transpiles destructured exports, resulting in
// `exports.SomeName = void 0;` which causes runtime errors.
// See: https://github.com/SocketDev/socket-packageurl-js/issues/3
const ReflectApply = Reflect.apply
const ReflectConstruct = Reflect.construct

let _Console: typeof import('console').Console | undefined
/**
 * Construct a new Console instance.
 * @private
 */
/*@__NO_SIDE_EFFECTS__*/
function constructConsole(...args: unknown[]) {
  if (_Console === undefined) {
    // Use non-'node:' prefixed require to avoid Webpack errors.

    const nodeConsole = /*@__PURE__*/ require('node:console')
    _Console = nodeConsole.Console
  }
  return ReflectConstruct(
    // biome-ignore lint/style/noNonNullAssertion: Initialized above.
    _Console! as new (
      ...args: unknown[]
    ) => Console, // eslint-disable-line no-undef
    args,
  )
}

/**
 * Get the yoctocolors module for terminal colors.
 * @private
 */
/*@__NO_SIDE_EFFECTS__*/
function getYoctocolors() {
  return yoctocolorsCjs
}

export const LOG_SYMBOLS = /*@__PURE__*/ (() => {
  const target: Record<string, string> = {
    __proto__: null,
  } as unknown as Record<string, string>
  // Mutable handler to simulate a frozen target.
  const handler: ProxyHandler<Record<string, string>> = {
    __proto__: null,
  } as unknown as ProxyHandler<Record<string, string>>
  const init = () => {
    const supported = isUnicodeSupported()
    const colors = getYoctocolors()
    objectAssign(target, {
      fail: colors.red(supported ? '✖' : '×'),
      info: colors.blue(supported ? 'ℹ' : 'i'),
      success: colors.green(supported ? '✔' : '√'),
      warn: colors.yellow(supported ? '⚠' : '‼'),
    })
    objectFreeze(target)
    // The handler of a Proxy is mutable after proxy instantiation.
    // We delete the traps to defer to native behavior.
    for (const trapName in handler) {
      delete handler[trapName as keyof ProxyHandler<Record<string, string>>]
    }
  }
  for (const trapName of Reflect.ownKeys(Reflect)) {
    const fn = (Reflect as Record<PropertyKey, unknown>)[trapName]
    if (typeof fn === 'function') {
      ;(handler as Record<string, (...args: unknown[]) => unknown>)[
        trapName as string
      ] = (...args: unknown[]) => {
        init()
        return fn(...args)
      }
    }
  }
  return new Proxy(target, handler)
})()

const boundConsoleEntries = [
  // Add bound properties from console[kBindProperties](ignoreErrors, colorMode, groupIndentation).
  // https://github.com/nodejs/node/blob/v24.0.1/lib/internal/console/constructor.js#L230-L265
  '_stderrErrorHandler',
  '_stdoutErrorHandler',
  // Add methods that need to be bound to function properly.
  'assert',
  'clear',
  'count',
  'countReset',
  'createTask',
  'debug',
  'dir',
  'dirxml',
  'error',
  // Skip group methods because in at least Node 20 with the Node --frozen-intrinsics
  // flag it triggers a readonly property for Symbol(kGroupIndent). Instead, we
  // implement these methods ourselves.
  //'group',
  //'groupCollapsed',
  //'groupEnd',
  'info',
  'log',
  'table',
  'time',
  'timeEnd',
  'timeLog',
  'trace',
  'warn',
]
  // biome-ignore lint/suspicious/noExplicitAny: Dynamic console method access.
  .filter(n => typeof (globalConsole as any)[n] === 'function')
  // biome-ignore lint/suspicious/noExplicitAny: Dynamic console method access.
  .map(n => [n, (globalConsole as any)[n].bind(globalConsole)])

const consolePropAttributes = {
  __proto__: null,
  writable: true,
  enumerable: false,
  configurable: true,
}
const maxIndentation = 1000
const privateConsole = new WeakMap()

const consoleSymbols = Object.getOwnPropertySymbols(globalConsole)
export const incLogCallCountSymbol = Symbol.for('logger.logCallCount++')
const kGroupIndentationWidthSymbol =
  // biome-ignore lint/suspicious/noExplicitAny: Symbol property access.
  consoleSymbols.find(s => (s as any).label === 'kGroupIndentWidth') ??
  Symbol('kGroupIndentWidth')
export const lastWasBlankSymbol = Symbol.for('logger.lastWasBlank')

/**
 * Custom Logger class that wraps console with additional features.
 * Supports indentation, symbols, and blank line tracking.
 */
/*@__PURE__*/
export class Logger {
  static LOG_SYMBOLS = LOG_SYMBOLS

  #parent?: Logger
  #boundStream?: 'stderr' | 'stdout'
  #stderrLogger?: Logger
  #stdoutLogger?: Logger
  #stderrIndention = ''
  #stdoutIndention = ''
  #lastWasBlank = false
  #logCallCount = 0
  #constructorArgs: unknown[]
  #options: Record<string, unknown>

  constructor(...args: unknown[]) {
    // Store constructor args for child loggers
    this.#constructorArgs = args

    // Store options if provided (for future extensibility)
    const options = args['0']
    if (typeof options === 'object' && options !== null) {
      this.#options = { __proto__: null, ...options }
    } else {
      this.#options = { __proto__: null }
    }

    if (args.length) {
      privateConsole.set(this, constructConsole(...args))
    } else {
      // Create a new console that acts like the builtin one so that it will
      // work with Node's --frozen-intrinsics flag.
      const con = constructConsole({
        stdout: process.stdout,
        stderr: process.stderr,
      }) as typeof console & Record<string, unknown>
      for (const { 0: key, 1: method } of boundConsoleEntries) {
        con[key] = method
      }
      privateConsole.set(this, con)
    }
  }

  /**
   * Get a logger instance bound to stderr.
   * All operations on this instance will use stderr.
   */
  get stderr(): Logger {
    if (!this.#stderrLogger) {
      // Pass parent's constructor args to maintain config
      const instance = new Logger(...this.#constructorArgs)
      instance.#parent = this
      instance.#boundStream = 'stderr'
      instance.#options = { __proto__: null, ...this.#options }
      this.#stderrLogger = instance
    }
    return this.#stderrLogger
  }

  /**
   * Get a logger instance bound to stdout.
   * All operations on this instance will use stdout.
   */
  get stdout(): Logger {
    if (!this.#stdoutLogger) {
      // Pass parent's constructor args to maintain config
      const instance = new Logger(...this.#constructorArgs)
      instance.#parent = this
      instance.#boundStream = 'stdout'
      instance.#options = { __proto__: null, ...this.#options }
      this.#stdoutLogger = instance
    }
    return this.#stdoutLogger
  }

  /**
   * Get the root logger (for accessing shared indentation state).
   * @private
   */
  #getRoot(): Logger {
    return this.#parent || this
  }

  /**
   * Get indentation for a specific stream.
   * @private
   */
  #getIndent(stream: 'stderr' | 'stdout'): string {
    const root = this.#getRoot()
    return stream === 'stderr' ? root.#stderrIndention : root.#stdoutIndention
  }

  /**
   * Set indentation for a specific stream.
   * @private
   */
  #setIndent(stream: 'stderr' | 'stdout', value: string): void {
    const root = this.#getRoot()
    if (stream === 'stderr') {
      root.#stderrIndention = value
    } else {
      root.#stdoutIndention = value
    }
  }

  /**
   * Get the target stream for this logger instance.
   * @private
   */
  #getTargetStream(): 'stderr' | 'stdout' {
    return this.#boundStream || 'stderr'
  }

  /**
   * Apply a console method with indentation.
   * @private
   */
  #apply(
    methodName: string,
    args: unknown[],
    stream?: 'stderr' | 'stdout',
  ): this {
    const con = privateConsole.get(this) as typeof console &
      Record<string, unknown>
    const text = args.at(0)
    const hasText = typeof text === 'string'
    // Determine which stream this method writes to
    const targetStream = stream || (methodName === 'log' ? 'stdout' : 'stderr')
    const indent = this.#getIndent(targetStream)
    const logArgs = hasText
      ? [applyLinePrefix(text, { prefix: indent }), ...args.slice(1)]
      : args
    ReflectApply(
      con[methodName] as (...args: unknown[]) => unknown,
      con,
      logArgs,
    )
    this[lastWasBlankSymbol](hasText && isBlankString(logArgs[0]))
    // biome-ignore lint/suspicious/noExplicitAny: Symbol method access.
    ;(this as any)[incLogCallCountSymbol]()
    return this
  }

  /**
   * Strip log symbols from the start of text.
   * @private
   */
  #stripSymbols(text: string): string {
    // Strip both unicode and emoji forms of log symbols from the start.
    // Matches: ✖, ×, ✖️, ⚠, ‼, ⚠️, ✔, √, ✔️, ℹ, ℹ️
    // Also handles variation selectors (U+FE0F) and whitespace after symbol.
    // Note: We don't strip standalone 'i' to avoid breaking words like 'info'.
    return text.replace(/^[✖×⚠‼✔√ℹ]\uFE0F?\s*/u, '')
  }

  /**
   * Apply a method with a symbol prefix.
   * @private
   */
  #symbolApply(symbolType: string, args: unknown[]): this {
    const con = privateConsole.get(this)
    let text = args.at(0)
    // biome-ignore lint/suspicious/noImplicitAnyLet: Flexible argument handling.
    let extras
    if (typeof text === 'string') {
      text = this.#stripSymbols(text)
      extras = args.slice(1)
    } else {
      extras = args
      text = ''
    }
    // Note: Meta status messages (info/fail/etc) always go to stderr.
    const indent = this.#getIndent('stderr')
    con.error(
      applyLinePrefix(`${LOG_SYMBOLS[symbolType]} ${text}`, {
        prefix: indent,
      }),
      ...extras,
    )
    this.#lastWasBlank = false
    // biome-ignore lint/suspicious/noExplicitAny: Symbol method access.
    ;(this as any)[incLogCallCountSymbol]()
    return this
  }

  /**
   * Get the current log call count.
   */
  get logCallCount() {
    return this.#logCallCount
  }

  /**
   * Increment the log call count.
   */
  [incLogCallCountSymbol]() {
    this.#logCallCount += 1
    return this
  }

  /**
   * Set whether the last logged line was blank.
   */
  [lastWasBlankSymbol](value: unknown): this {
    this.#lastWasBlank = !!value
    return this
  }

  /**
   * Log an assertion.
   */
  assert(value: unknown, ...message: unknown[]): this {
    const con = privateConsole.get(this)
    con.assert(value, ...message)
    this[lastWasBlankSymbol](false)
    return value ? this : this[incLogCallCountSymbol]()
  }

  /**
   * Clear the visible terminal screen.
   * Only available on the main logger instance.
   */
  clearVisible() {
    if (this.#boundStream) {
      throw new Error(
        'clearVisible() is only available on the main logger instance, not on stream-bound instances',
      )
    }
    const con = privateConsole.get(this)
    con.clear()
    // biome-ignore lint/suspicious/noExplicitAny: Internal console property access.
    if ((con as any)._stdout.isTTY) {
      // biome-ignore lint/suspicious/noExplicitAny: Symbol method access.
      ;(this as any)[lastWasBlankSymbol](true)
      this.#logCallCount = 0
    }
    return this
  }

  /**
   * Log a count for the given label.
   */
  count(label?: string): this {
    const con = privateConsole.get(this)
    con.count(label)
    this[lastWasBlankSymbol](false)
    return this[incLogCallCountSymbol]()
  }

  /**
   * Create a task with a given name.
   */
  createTask(name: string): Task {
    return {
      run: <T>(f: () => T): T => {
        this.log(`Starting task: ${name}`)
        const result = f()
        this.log(`Completed task: ${name}`)
        return result
      },
    }
  }

  /**
   * Decrease indentation level.
   * If called on main logger, affects both streams.
   * If called on stream-bound logger, affects only that stream.
   */
  dedent(spaces = 2) {
    if (this.#boundStream) {
      // Only affect bound stream
      const current = this.#getIndent(this.#boundStream)
      this.#setIndent(this.#boundStream, current.slice(0, -spaces))
    } else {
      // Affect both streams
      const stderrCurrent = this.#getIndent('stderr')
      const stdoutCurrent = this.#getIndent('stdout')
      this.#setIndent('stderr', stderrCurrent.slice(0, -spaces))
      this.#setIndent('stdout', stdoutCurrent.slice(0, -spaces))
    }
    return this
  }

  /**
   * Display an object's properties.
   */
  dir(obj: unknown, options?: unknown): this {
    const con = privateConsole.get(this)
    con.dir(obj, options)
    this[lastWasBlankSymbol](false)
    return this[incLogCallCountSymbol]()
  }

  /**
   * Display data as XML.
   */
  dirxml(...data: unknown[]): this {
    const con = privateConsole.get(this)
    con.dirxml(data)
    this[lastWasBlankSymbol](false)
    return this[incLogCallCountSymbol]()
  }

  /**
   * Log an error message.
   */
  error(...args: unknown[]): this {
    return this.#apply('error', args)
  }

  /**
   * Log a newline to stderr if last line wasn't blank.
   */
  errorNewline() {
    return this.#lastWasBlank ? this : this.error('')
  }

  /**
   * Log a failure message with symbol.
   */
  fail(...args: unknown[]): this {
    return this.#symbolApply('fail', args)
  }

  /**
   * Start a new log group.
   */
  group(...label: unknown[]): this {
    const { length } = label
    if (length) {
      ReflectApply(this.log, this, label)
    }
    // biome-ignore lint/suspicious/noExplicitAny: Symbol property access.
    this.indent((this as any)[kGroupIndentationWidthSymbol])
    if (length) {
      // biome-ignore lint/suspicious/noExplicitAny: Symbol method access.
      ;(this as any)[lastWasBlankSymbol](false)
      // biome-ignore lint/suspicious/noExplicitAny: Symbol method access.
      ;(this as any)[incLogCallCountSymbol]()
    }
    return this
  }

  /**
   * Start a new collapsed log group (alias for group).
   */
  // groupCollapsed is an alias of group.
  // https://nodejs.org/api/console.html#consolegroupcollapsed
  groupCollapsed(...label: unknown[]): this {
    return ReflectApply(this.group, this, label)
  }

  /**
   * End the current log group.
   */
  groupEnd() {
    // biome-ignore lint/suspicious/noExplicitAny: Symbol property access.
    this.dedent((this as any)[kGroupIndentationWidthSymbol])
    return this
  }

  /**
   * Increase indentation level.
   * If called on main logger, affects both streams.
   * If called on stream-bound logger, affects only that stream.
   */
  indent(spaces = 2) {
    const spacesToAdd = ' '.repeat(Math.min(spaces, maxIndentation))
    if (this.#boundStream) {
      // Only affect bound stream
      const current = this.#getIndent(this.#boundStream)
      this.#setIndent(this.#boundStream, current + spacesToAdd)
    } else {
      // Affect both streams
      const stderrCurrent = this.#getIndent('stderr')
      const stdoutCurrent = this.#getIndent('stdout')
      this.#setIndent('stderr', stderrCurrent + spacesToAdd)
      this.#setIndent('stdout', stdoutCurrent + spacesToAdd)
    }
    return this
  }

  /**
   * Log an info message with symbol.
   */
  info(...args: unknown[]): this {
    return this.#symbolApply('info', args)
  }

  /**
   * Log a message.
   */
  log(...args: unknown[]): this {
    return this.#apply('log', args)
  }

  /**
   * Log a newline to stdout if last line wasn't blank.
   */
  logNewline() {
    return this.#lastWasBlank ? this : this.log('')
  }

  /**
   * Reset indentation to zero.
   * If called on main logger, resets both streams.
   * If called on stream-bound logger, resets only that stream.
   */
  resetIndent() {
    if (this.#boundStream) {
      // Only reset bound stream
      this.#setIndent(this.#boundStream, '')
    } else {
      // Reset both streams
      this.#setIndent('stderr', '')
      this.#setIndent('stdout', '')
    }
    return this
  }

  /**
   * Log a main step with blank line before (stateless).
   */
  step(msg: string, ...extras: unknown[]): this {
    // Add blank line before the step message.
    if (!this.#lastWasBlank) {
      // Use this.log() to properly track the blank line.
      this.log('')
    }
    // Let log() handle all tracking.
    return this.log(msg, ...extras)
  }

  /**
   * Log an indented substep (stateless).
   */
  substep(msg: string, ...extras: unknown[]): this {
    // Add 2-space indent to the message.
    const indentedMsg = `  ${msg}`
    // Let log() handle all tracking.
    return this.log(indentedMsg, ...extras)
  }

  /**
   * Log a success message with symbol.
   */
  success(...args: unknown[]): this {
    return this.#symbolApply('success', args)
  }

  /**
   * Log a done message (alias for success).
   * Does NOT auto-clear. Call clearLine() first if needed after progress().
   */
  done(...args: unknown[]): this {
    return this.#symbolApply('success', args)
  }

  /**
   * Display data in a table format.
   */
  table(tabularData: unknown, properties?: readonly string[]): this {
    const con = privateConsole.get(this)
    con.table(tabularData, properties)
    this[lastWasBlankSymbol](false)
    return this[incLogCallCountSymbol]()
  }

  /**
   * End a timer and log the elapsed time.
   */
  timeEnd(label?: string): this {
    const con = privateConsole.get(this)
    con.timeEnd(label)
    this[lastWasBlankSymbol](false)
    return this[incLogCallCountSymbol]()
  }

  /**
   * Log the current timer value.
   */
  timeLog(label?: string, ...data: unknown[]): this {
    const con = privateConsole.get(this)
    con.timeLog(label, ...data)
    this[lastWasBlankSymbol](false)
    return this[incLogCallCountSymbol]()
  }

  /**
   * Log a stack trace.
   */
  trace(message?: unknown, ...args: unknown[]): this {
    const con = privateConsole.get(this)
    con.trace(message, ...args)
    this[lastWasBlankSymbol](false)
    return this[incLogCallCountSymbol]()
  }

  /**
   * Log a warning message with symbol.
   */
  warn(...args: unknown[]): this {
    return this.#symbolApply('warn', args)
  }

  /**
   * Write to stdout without a newline or indentation.
   */
  write(text: string): this {
    const con = privateConsole.get(this)
    con._stdout.write(text)
    this[lastWasBlankSymbol](false)
    return this
  }

  /**
   * Show a progress indicator (can be cleared with clearLine).
   * Simple status message without spinner animation.
   */
  progress(text: string): this {
    const con = privateConsole.get(this)
    const stream = this.#getTargetStream()
    const streamObj = stream === 'stderr' ? con._stderr : con._stdout
    streamObj.write(`∴ ${text}`)
    this[lastWasBlankSymbol](false)
    return this
  }

  /**
   * Clear the current line.
   */
  clearLine(): this {
    const con = privateConsole.get(this)
    const stream = this.#getTargetStream()
    const streamObj = stream === 'stderr' ? con._stderr : con._stdout
    if (streamObj.isTTY) {
      streamObj.cursorTo(0)
      streamObj.clearLine(0)
    } else {
      streamObj.write('\r\x1b[K')
    }
    return this
  }
}

Object.defineProperties(
  Logger.prototype,
  Object.fromEntries(
    (() => {
      const entries: Array<[string | symbol, PropertyDescriptor]> = [
        [
          kGroupIndentationWidthSymbol,
          {
            ...consolePropAttributes,
            value: 2,
          },
        ],
        [
          Symbol.toStringTag,
          {
            __proto__: null,
            configurable: true,
            value: 'logger',
          } as PropertyDescriptor,
        ],
      ]
      for (const { 0: key, 1: value } of Object.entries(globalConsole)) {
        // biome-ignore lint/suspicious/noExplicitAny: Dynamic prototype check.
        if (!(Logger.prototype as any)[key] && typeof value === 'function') {
          // Dynamically name the log method without using Object.defineProperty.
          const { [key]: func } = {
            [key](...args: unknown[]) {
              const con = privateConsole.get(this)
              // biome-ignore lint/suspicious/noExplicitAny: Dynamic console method access.
              const result = (con as any)[key](...args)
              return result === undefined || result === con ? this : result
            },
          }
          entries.push([
            key,
            {
              ...consolePropAttributes,
              value: func,
            },
          ])
        }
      }
      return entries
    })(),
  ),
)

export const logger = new Logger()
