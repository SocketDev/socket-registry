/**
 * @fileoverview Console logging utilities with line prefix support.
 * Provides enhanced console methods with formatted output capabilities.
 */

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
const ObjectAssign = Object.assign
const ObjectFreeze = Object.freeze
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
function constructConsole(...args: any[]) {
  if (_Console === undefined) {
    // Use non-'node:' prefixed require to avoid Webpack errors.
    // eslint-disable-next-line n/prefer-node-protocol
    const nodeConsole = /*@__PURE__*/ require('console')
    _Console = nodeConsole.Console
  }
  return ReflectConstruct(_Console!, args)
}

let _yoctocolors: typeof import('yoctocolors-cjs') | undefined
/**
 * Get the yoctocolors module for terminal colors.
 * @private
 */
/*@__NO_SIDE_EFFECTS__*/
function getYoctocolors() {
  if (_yoctocolors === undefined) {
    _yoctocolors = require('../external/yoctocolors-cjs')
  }
  return _yoctocolors!
}

export const LOG_SYMBOLS = /*@__PURE__*/ (() => {
  const target: Record<string, string> = { __proto__: null } as any
  // Mutable handler to simulate a frozen target.
  const handler: ProxyHandler<any> = { __proto__: null } as any
  const init = () => {
    const supported =
      /*@__PURE__*/ require('../external/@socketregistry/is-unicode-supported')()
    const colors = getYoctocolors()
    ObjectAssign(target, {
      fail: colors.red(supported ? '✖' : '×'),
      info: colors['blue'](supported ? 'ℹ' : 'i'),
      success: colors['green'](supported ? '✔' : '√'),
      warn: colors['yellow'](supported ? '⚠' : '‼'),
    })
    ObjectFreeze(target)
    // The handler of a Proxy is mutable after proxy instantiation.
    // We delete the traps to defer to native behavior.
    for (const trapName in handler) {
      delete handler[trapName as keyof ProxyHandler<any>]
    }
  }
  for (const trapName of Reflect.ownKeys(Reflect)) {
    const fn = (Reflect as any)[trapName]
    if (typeof fn === 'function') {
      ;(handler as any)[trapName] = (...args: any[]) => {
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
  .filter(n => typeof (globalConsole as any)[n] === 'function')
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

  #indention = ''
  #lastWasBlank = false
  #logCallCount = 0

  constructor(...args: any[]) {
    if (args.length) {
      privateConsole.set(this, constructConsole(...args))
    } else {
      // Create a new console that acts like the builtin one so that it will
      // work with Node's --frozen-intrinsics flag.
      const con = constructConsole({
        stdout: process.stdout,
        stderr: process.stderr,
      })
      for (const { 0: key, 1: method } of boundConsoleEntries) {
        con[key] = method
      }
      privateConsole.set(this, con)
    }
  }

  /**
   * Apply a console method with indentation.
   * @private
   */
  #apply(methodName: string, args: any[]): this {
    const con = privateConsole.get(this)
    const text = args.at(0)
    const hasText = typeof text === 'string'
    const logArgs = hasText
      ? [applyLinePrefix(text, this.#indention), ...args.slice(1)]
      : args
    ReflectApply(con[methodName], con, logArgs)
    this[lastWasBlankSymbol](hasText && isBlankString(logArgs[0]))
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
  #symbolApply(symbolType: string, args: any[]): this {
    const con = privateConsole.get(this)
    let text = args.at(0)
    let extras
    if (typeof text === 'string') {
      text = this.#stripSymbols(text)
      extras = args.slice(1)
    } else {
      extras = args
      text = ''
    }
    // Note: Meta status messages (info/fail/etc) always go to stderr.
    con.error(
      applyLinePrefix(`${LOG_SYMBOLS[symbolType]} ${text}`, this.#indention),
      ...extras,
    )
    this.#lastWasBlank = false
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
  [lastWasBlankSymbol](value: any): this {
    this.#lastWasBlank = !!value
    return this
  }

  /**
   * Log an assertion.
   */
  assert(value: any, ...message: any[]): this {
    const con = privateConsole.get(this)
    con.assert(value, ...message)
    this[lastWasBlankSymbol](false)
    return value ? this : this[incLogCallCountSymbol]()
  }

  /**
   * Clear the console.
   */
  clear() {
    const con = privateConsole.get(this)
    con.clear()
    if (con._stdout.isTTY) {
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
   */
  dedent(spaces = 2) {
    this.#indention = this.#indention.slice(0, -spaces)
    return this
  }

  /**
   * Display an object's properties.
   */
  dir(obj: any, options?: any): this {
    const con = privateConsole.get(this)
    con.dir(obj, options)
    this[lastWasBlankSymbol](false)
    return this[incLogCallCountSymbol]()
  }

  /**
   * Display data as XML.
   */
  dirxml(...data: any[]): this {
    const con = privateConsole.get(this)
    con.dirxml(data)
    this[lastWasBlankSymbol](false)
    return this[incLogCallCountSymbol]()
  }

  /**
   * Log an error message.
   */
  error(...args: any[]): this {
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
  fail(...args: any[]): this {
    return this.#symbolApply('fail', args)
  }

  /**
   * Start a new log group.
   */
  group(...label: any[]): this {
    const { length } = label
    if (length) {
      ReflectApply(this.log, this, label)
    }
    this.indent((this as any)[kGroupIndentationWidthSymbol])
    if (length) {
      ;(this as any)[lastWasBlankSymbol](false)
      ;(this as any)[incLogCallCountSymbol]()
    }
    return this
  }

  /**
   * Start a new collapsed log group (alias for group).
   */
  // groupCollapsed is an alias of group.
  // https://nodejs.org/api/console.html#consolegroupcollapsed
  groupCollapsed(...label: any[]): this {
    return ReflectApply(this.group, this, label)
  }

  /**
   * End the current log group.
   */
  groupEnd() {
    this.dedent((this as any)[kGroupIndentationWidthSymbol])
    return this
  }

  /**
   * Increase indentation level.
   */
  indent(spaces = 2) {
    this.#indention += ' '.repeat(Math.min(spaces, maxIndentation))
    return this
  }

  /**
   * Log an info message with symbol.
   */
  info(...args: any[]): this {
    return this.#symbolApply('info', args)
  }

  /**
   * Log a message.
   */
  log(...args: any[]): this {
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
   */
  resetIndent() {
    this.#indention = ''
    return this
  }

  /**
   * Log a success message with symbol.
   */
  success(...args: any[]): this {
    return this.#symbolApply('success', args)
  }

  /**
   * Display data in a table format.
   */
  table(tabularData: any, properties?: readonly string[]): this {
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
  timeLog(label?: string, ...data: any[]): this {
    const con = privateConsole.get(this)
    con.timeLog(label, ...data)
    this[lastWasBlankSymbol](false)
    return this[incLogCallCountSymbol]()
  }

  /**
   * Log a stack trace.
   */
  trace(message?: any, ...args: any[]): this {
    const con = privateConsole.get(this)
    con.trace(message, ...args)
    this[lastWasBlankSymbol](false)
    return this[incLogCallCountSymbol]()
  }

  /**
   * Log a warning message with symbol.
   */
  warn(...args: any[]): this {
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
        if (!(Logger.prototype as any)[key] && typeof value === 'function') {
          // Dynamically name the log method without using Object.defineProperty.
          const { [key]: func } = {
            [key](...args: any[]) {
              const con = privateConsole.get(this)
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
