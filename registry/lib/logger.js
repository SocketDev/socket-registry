'use strict'

const globalConsole = console
const { assign: ObjectAssign, freeze: ObjectFreeze } = Object
const { apply: ReflectApply, construct: ReflectConstruct } = Reflect

const { applyLinePrefix, isBlankString } = /*@__PURE__*/ require('./strings')

let _Console
/**
 * Construct a new Console instance.
 * @param {...any} args - Arguments to pass to the Console constructor.
 * @returns {Console} A new Console instance.
 * @private
 */
/*@__NO_SIDE_EFFECTS__*/
function constructConsole(...args) {
  if (_Console === undefined) {
    // Use non-'node:' prefixed require to avoid Webpack errors.
    // eslint-disable-next-line n/prefer-node-protocol
    const nodeConsole = /*@__PURE__*/ require('console')
    _Console = nodeConsole.Console
  }
  return ReflectConstruct(_Console, args)
}

let _yoctocolors
/**
 * Get the yoctocolors module for terminal colors.
 * @returns {Object} The yoctocolors module.
 * @private
 */
/*@__NO_SIDE_EFFECTS__*/
function getYoctocolors() {
  if (_yoctocolors === undefined) {
    _yoctocolors = { ...require('../external/yoctocolors-cjs') }
  }
  return _yoctocolors
}

const LOG_SYMBOLS = /*@__PURE__*/ (() => {
  const target = { __proto__: null }
  // Mutable handler to simulate a frozen target.
  const handler = { __proto__: null }
  const init = () => {
    const supported =
      /*@__PURE__*/ require('../external/@socketregistry/is-unicode-supported')()
    const colors = getYoctocolors()
    ObjectAssign(target, {
      fail: colors.red(supported ? '✖' : '×'),
      info: colors.blue(supported ? 'ℹ' : 'i'),
      success: colors.green(supported ? '✔' : '√'),
      warn: colors.yellow(supported ? '⚠' : '‼')
    })
    ObjectFreeze(target)
    // The handler of a Proxy is mutable after proxy instantiation.
    // We delete the traps to defer to native behavior.
    for (const trapName in handler) {
      delete handler[trapName]
    }
  }
  for (const trapName of Reflect.ownKeys(Reflect)) {
    const fn = Reflect[trapName]
    if (typeof fn === 'function') {
      handler[trapName] = (...args) => {
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
  'warn'
]
  .filter(n => typeof globalConsole[n] === 'function')
  .map(n => [n, globalConsole[n].bind(globalConsole)])

const consolePropAttributes = {
  __proto__: null,
  writable: true,
  enumerable: false,
  configurable: true
}
const maxIndentation = 1000
const privateConsole = new WeakMap()

const consoleSymbols = Object.getOwnPropertySymbols(globalConsole)
const incLogCallCountSymbol = Symbol.for('logger.logCallCount++')
const kGroupIndentationWidthSymbol =
  consoleSymbols.find(s => s.label === 'kGroupIndentWidth') ??
  Symbol('kGroupIndentWidth')
const lastWasBlankSymbol = Symbol.for('logger.lastWasBlank')

/**
 * Custom Logger class that wraps console with additional features.
 * Supports indentation, symbols, and blank line tracking.
 */
/*@__PURE__*/
class Logger {
  static LOG_SYMBOLS = LOG_SYMBOLS

  #indention = ''
  #lastWasBlank = false
  #logCallCount = 0

  constructor(...args) {
    if (args.length) {
      privateConsole.set(this, constructConsole(...args))
    } else {
      // Create a new console that acts like the builtin one so that it will
      // work with Node's --frozen-intrinsics flag.
      const con = constructConsole({
        stdout: process.stdout,
        stderr: process.stderr
      })
      for (const { 0: key, 1: method } of boundConsoleEntries) {
        con[key] = method
      }
      privateConsole.set(this, con)
    }
  }

  /**
   * Apply a console method with indentation.
   * @param {string} methodName - Name of the console method to call.
   * @param {any[]} args - Arguments to pass to the method.
   * @returns {Logger} This Logger instance for chaining.
   * @private
   */
  #apply(methodName, args) {
    const con = privateConsole.get(this)
    const text = args.at(0)
    const hasText = typeof text === 'string'
    const logArgs = hasText
      ? [applyLinePrefix(text, this.#indention), ...args.slice(1)]
      : args
    ReflectApply(con[methodName], con, logArgs)
    this[lastWasBlankSymbol](hasText && isBlankString(logArgs[0]))
    this[incLogCallCountSymbol]()
    return this
  }

  /**
   * Apply a method with a symbol prefix.
   * @param {string} symbolType - Type of symbol to use (fail, info, success, warn).
   * @param {any[]} args - Arguments to pass to the method.
   * @returns {Logger} This Logger instance for chaining.
   * @private
   */
  #symbolApply(symbolType, args) {
    const con = privateConsole.get(this)
    let text = args.at(0)
    let extras
    if (typeof text === 'string') {
      extras = args.slice(1)
    } else {
      extras = args
      text = ''
    }
    // Note: Meta status messages (info/fail/etc) always go to stderr.
    con.error(
      applyLinePrefix(`${LOG_SYMBOLS[symbolType]} ${text}`, this.#indention),
      ...extras
    )
    this.#lastWasBlank = false
    this[incLogCallCountSymbol]()
    return this
  }

  /**
   * Get the current log call count.
   * @returns {number} The number of log calls made.
   */
  get logCallCount() {
    return this.#logCallCount
  }

  /**
   * Increment the log call count.
   * @returns {Logger} This Logger instance for chaining.
   */
  [incLogCallCountSymbol]() {
    this.#logCallCount += 1
    return this
  }

  /**
   * Set whether the last logged line was blank.
   * @param {boolean} value - Whether the last line was blank.
   * @returns {Logger} This Logger instance for chaining.
   */
  [lastWasBlankSymbol](value) {
    this.#lastWasBlank = !!value
    return this
  }

  /**
   * Log an assertion.
   * @param {any} value - Value to assert.
   * @param {...any} message - Message to log if assertion fails.
   * @returns {Logger} This Logger instance for chaining.
   */
  assert(value, ...message) {
    const con = privateConsole.get(this)
    con.assert(value, ...message)
    this[lastWasBlankSymbol](false)
    return value ? this : this[incLogCallCountSymbol]()
  }

  /**
   * Clear the console.
   * @returns {Logger} This Logger instance for chaining.
   */
  clear() {
    const con = privateConsole.get(this)
    con.clear()
    if (con._stdout.isTTY) {
      this[lastWasBlankSymbol](true)
      this.#logCallCount = 0
    }
    return this
  }

  /**
   * Log a count for the given label.
   * @param {string} label - Label to count.
   * @returns {Logger} This Logger instance for chaining.
   */
  count(label) {
    const con = privateConsole.get(this)
    con.count(label)
    this[lastWasBlankSymbol](false)
    return this[incLogCallCountSymbol]()
  }

  /**
   * Decrease indentation level.
   * @param {number} [spaces=2] - Number of spaces to dedent.
   * @returns {Logger} This Logger instance for chaining.
   */
  dedent(spaces = 2) {
    this.#indention = this.#indention.slice(0, -spaces)
    return this
  }

  /**
   * Display an object's properties.
   * @param {any} obj - Object to display.
   * @param {Object} [options] - Display options.
   * @returns {Logger} This Logger instance for chaining.
   */
  dir(obj, options) {
    const con = privateConsole.get(this)
    con.dir(obj, options)
    this[lastWasBlankSymbol](false)
    return this[incLogCallCountSymbol]()
  }

  /**
   * Display data as XML.
   * @param {...any} data - Data to display.
   * @returns {Logger} This Logger instance for chaining.
   */
  dirxml(...data) {
    const con = privateConsole.get(this)
    con.dirxml(data)
    this[lastWasBlankSymbol](false)
    return this[incLogCallCountSymbol]()
  }

  /**
   * Log an error message.
   * @param {...any} args - Arguments to log.
   * @returns {Logger} This Logger instance for chaining.
   */
  error(...args) {
    return this.#apply('error', args)
  }

  /**
   * Log a newline to stderr if last line wasn't blank.
   * @returns {Logger} This Logger instance for chaining.
   */
  errorNewline() {
    return this.#lastWasBlank ? this : this.error('')
  }

  /**
   * Log a failure message with symbol.
   * @param {...any} args - Arguments to log.
   * @returns {Logger} This Logger instance for chaining.
   */
  fail(...args) {
    return this.#symbolApply('fail', args)
  }

  /**
   * Start a new log group.
   * @param {...any} label - Label for the group.
   * @returns {Logger} This Logger instance for chaining.
   */
  group(...label) {
    const { length } = label
    if (length) {
      ReflectApply(this.log, this, label)
    }
    this.indent(this[kGroupIndentationWidthSymbol])
    if (length) {
      this[lastWasBlankSymbol](false)
      this[incLogCallCountSymbol]()
    }
    return this
  }

  /**
   * Start a new collapsed log group (alias for group).
   * @param {...any} label - Label for the group.
   * @returns {Logger} This Logger instance for chaining.
   */
  // groupCollapsed is an alias of group.
  // https://nodejs.org/api/console.html#consolegroupcollapsed
  groupCollapsed(...label) {
    return ReflectApply(this.group, this, label)
  }

  /**
   * End the current log group.
   * @returns {Logger} This Logger instance for chaining.
   */
  groupEnd() {
    this.dedent(this[kGroupIndentationWidthSymbol])
    return this
  }

  /**
   * Increase indentation level.
   * @param {number} [spaces=2] - Number of spaces to indent.
   * @returns {Logger} This Logger instance for chaining.
   */
  indent(spaces = 2) {
    this.#indention += ' '.repeat(Math.min(spaces, maxIndentation))
    return this
  }

  /**
   * Log an info message with symbol.
   * @param {...any} args - Arguments to log.
   * @returns {Logger} This Logger instance for chaining.
   */
  info(...args) {
    return this.#symbolApply('info', args)
  }

  /**
   * Log a message.
   * @param {...any} args - Arguments to log.
   * @returns {Logger} This Logger instance for chaining.
   */
  log(...args) {
    return this.#apply('log', args)
  }

  /**
   * Log a newline to stdout if last line wasn't blank.
   * @returns {Logger} This Logger instance for chaining.
   */
  logNewline() {
    return this.#lastWasBlank ? this : this.log('')
  }

  /**
   * Reset indentation to zero.
   * @returns {Logger} This Logger instance for chaining.
   */
  resetIndent() {
    this.#indention = ''
    return this
  }

  /**
   * Log a success message with symbol.
   * @param {...any} args - Arguments to log.
   * @returns {Logger} This Logger instance for chaining.
   */
  success(...args) {
    return this.#symbolApply('success', args)
  }

  /**
   * Display data in a table format.
   * @param {any} tabularData - Data to display.
   * @param {string[]} [properties] - Properties to display.
   * @returns {Logger} This Logger instance for chaining.
   */
  table(tabularData, properties) {
    const con = privateConsole.get(this)
    con.table(tabularData, properties)
    this[lastWasBlankSymbol](false)
    return this[incLogCallCountSymbol]()
  }

  /**
   * End a timer and log the elapsed time.
   * @param {string} label - Timer label.
   * @returns {Logger} This Logger instance for chaining.
   */
  timeEnd(label) {
    const con = privateConsole.get(this)
    con.timeEnd(label)
    this[lastWasBlankSymbol](false)
    return this[incLogCallCountSymbol]()
  }

  /**
   * Log the current timer value.
   * @param {string} label - Timer label.
   * @param {...any} data - Additional data to log.
   * @returns {Logger} This Logger instance for chaining.
   */
  timeLog(label, ...data) {
    const con = privateConsole.get(this)
    con.timeLog(label, ...data)
    this[lastWasBlankSymbol](false)
    return this[incLogCallCountSymbol]()
  }

  /**
   * Log a stack trace.
   * @param {string} message - Message to log with trace.
   * @param {...any} args - Additional arguments.
   * @returns {Logger} This Logger instance for chaining.
   */
  trace(message, ...args) {
    const con = privateConsole.get(this)
    con.trace(message, ...args)
    this[lastWasBlankSymbol](false)
    return this[incLogCallCountSymbol]()
  }

  /**
   * Log a warning message with symbol.
   * @param {...any} args - Arguments to log.
   * @returns {Logger} This Logger instance for chaining.
   */
  warn(...args) {
    return this.#symbolApply('warn', args)
  }
}

Object.defineProperties(
  Logger.prototype,
  Object.fromEntries(
    (() => {
      const entries = [
        [
          kGroupIndentationWidthSymbol,
          {
            __proto__: null,
            ...consolePropAttributes,
            value: 2
          }
        ],
        [
          Symbol.toStringTag,
          {
            __proto__: null,
            configurable: true,
            value: 'logger'
          }
        ]
      ]
      for (const { 0: key, 1: value } of Object.entries(globalConsole)) {
        if (!Logger.prototype[key] && typeof value === 'function') {
          // Dynamically name the log method without using Object.defineProperty.
          const { [key]: func } = {
            [key](...args) {
              const con = privateConsole.get(this)
              const result = con[key](...args)
              return result === undefined || result === con ? this : result
            }
          }
          entries.push([
            key,
            {
              __proto__: null,
              ...consolePropAttributes,
              value: func
            }
          ])
        }
      }
      return entries
    })()
  )
)

const logger = new Logger()

module.exports = {
  incLogCallCountSymbol,
  lastWasBlankSymbol,
  LOG_SYMBOLS,
  Logger,
  logger
}
