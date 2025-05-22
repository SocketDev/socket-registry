'use strict'

const { isBlankString } = /*@__PURE__*/ require('./strings')

const globalConsole = console
const { apply: ReflectApply, construct: ReflectConstruct } = Reflect

let _Console
/*@__NO_SIDE_EFFECTS__*/
function constructConsole(...args) {
  if (_Console === undefined) {
    // Use non-'node:' prefixed require to avoid Webpack errors.
    // eslint-disable-next-line n/prefer-node-protocol
    _Console = /*@__PURE__*/ require('console').Console
  }
  return ReflectConstruct(_Console, args)
}

let _yoctocolors
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
    Object.assign(target, {
      fail: colors.red(supported ? '✖' : '×'),
      info: colors.blue(supported ? 'ℹ' : 'i'),
      success: colors.green(supported ? '✔' : '√'),
      warn: colors.yellow(supported ? '⚠' : '‼')
    })
    Object.freeze(target)
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

/*@__PURE__*/
function applyIndent(text, indent) {
  return indent.length
    ? `${indent}${text.includes('\n') ? text.replace(/\n/g, `\n${indent}`) : text}`
    : text
}

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

  #apply(methodName, args) {
    const con = privateConsole.get(this)
    const text = args.at(0)
    let extras
    if (typeof text === 'string') {
      extras = args.slice(1)
      con[methodName](applyIndent(text, this.#indention))
      this[lastWasBlankSymbol](isBlankString(text))
      this[incLogCallCountSymbol]()
    } else {
      extras = args
      this[lastWasBlankSymbol](false)
    }
    if (extras.length) {
      con[methodName](...extras)
      this[incLogCallCountSymbol]()
    }
    return this
  }

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
      applyIndent(`${LOG_SYMBOLS[symbolType]} ${text}`, this.#indention)
    )
    this.#lastWasBlank = false
    this[incLogCallCountSymbol]()
    if (extras.length) {
      con.error(...extras)
      this[incLogCallCountSymbol]()
    }
    return this
  }

  get logCallCount() {
    return this.#logCallCount
  }

  [incLogCallCountSymbol]() {
    this.#logCallCount += 1
    return this
  }

  [lastWasBlankSymbol](value) {
    this.#lastWasBlank = !!value
    return this
  }

  assert(value, ...message) {
    const con = privateConsole.get(this)
    con.assert(value, ...message)
    this[lastWasBlankSymbol](false)
    return value ? this : this[incLogCallCountSymbol]()
  }

  clear() {
    const con = privateConsole.get(this)
    con.clear()
    if (con._stdout.isTTY) {
      this[lastWasBlankSymbol](true)
      this.#logCallCount = 0
    }
    return this
  }

  count(label) {
    const con = privateConsole.get(this)
    con.count(label)
    this[lastWasBlankSymbol](false)
    return this[incLogCallCountSymbol]()
  }

  dedent(spaces = 2) {
    this.#indention = this.#indention.slice(0, -spaces)
    return this
  }

  dir(obj, options) {
    const con = privateConsole.get(this)
    con.dir(obj, options)
    this[lastWasBlankSymbol](false)
    return this[incLogCallCountSymbol]()
  }

  dirxml(...data) {
    const con = privateConsole.get(this)
    con.dirxml(data)
    this[lastWasBlankSymbol](false)
    return this[incLogCallCountSymbol]()
  }

  error(...args) {
    return this.#apply('error', args)
  }

  errorNewline() {
    return this.#lastWasBlank ? this : this.error('')
  }

  fail(...args) {
    return this.#symbolApply('fail', args)
  }

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

  // groupCollapsed is an alias of group.
  // https://nodejs.org/api/console.html#consolegroupcollapsed
  groupCollapsed(...label) {
    return ReflectApply(this.group, this, label)
  }

  groupEnd() {
    this.dedent(this[kGroupIndentationWidthSymbol])
    return this
  }

  indent(spaces = 2) {
    this.#indention += ' '.repeat(Math.min(spaces, maxIndentation))
    return this
  }

  info(...args) {
    return this.#symbolApply('info', args)
  }

  log(...args) {
    return this.#apply('log', args)
  }

  logNewline() {
    return this.#lastWasBlank ? this : this.log('')
  }

  resetIndent() {
    this.#indention = ''
    return this
  }

  success(...args) {
    return this.#symbolApply('success', args)
  }

  table(tabularData, properties) {
    const con = privateConsole.get(this)
    con.table(tabularData, properties)
    this[lastWasBlankSymbol](false)
    return this[incLogCallCountSymbol]()
  }

  timeEnd(label) {
    const con = privateConsole.get(this)
    con.timeEnd(label)
    this[lastWasBlankSymbol](false)
    return this[incLogCallCountSymbol]()
  }

  timeLog(label, ...data) {
    const con = privateConsole.get(this)
    con.timeLog(label, ...data)
    this[lastWasBlankSymbol](false)
    return this[incLogCallCountSymbol]()
  }

  trace(message, ...args) {
    const con = privateConsole.get(this)
    con.trace(message, ...args)
    this[lastWasBlankSymbol](false)
    return this[incLogCallCountSymbol]()
  }

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
