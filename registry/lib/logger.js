'use strict'

const { construct: ReflectConstruct } = Reflect

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
      fail: colors.red(supported ? '✖️' : '×'),
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
  'group',
  'groupCollapsed',
  'groupEnd',
  'info',
  'log',
  'table',
  'time',
  'timeEnd',
  'timeLog',
  'trace',
  'warn'
]
  .filter(n => typeof console[n] === 'function')
  .map(n => [n, console[n].bind(console)])

const consolePropAttributes = {
  __proto__: null,
  writable: true,
  enumerable: false,
  configurable: true
}

const incLogCallCountSymbol = Symbol.for('logger.logCallCount++')

const privateConsole = new WeakMap()

/*@__PURE__*/
class Logger {
  static LOG_SYMBOLS = LOG_SYMBOLS

  #indention = ''
  #logCallCount = 0

  constructor(...args) {
    if (args.length) {
      privateConsole.set(this, constructConsole(...args))
    } else {
      // Create a new console that acts like the builtin one so that it will
      // work with Node's --frozen-intrinsics flag.
      const newConsole = constructConsole({
        stdout: process.stdout,
        stderr: process.stderr
      })
      for (const { 0: key, 1: method } of boundConsoleEntries) {
        newConsole[key] = method
      }
      privateConsole.set(this, newConsole)
    }
  }

  #apply(methodName, args) {
    const text = args.at(0)
    const con = privateConsole.get(this)
    let extras
    if (typeof text === 'string') {
      extras = args.slice(1)
      con[methodName](`${this.#indention}${text}`)
      this[incLogCallCountSymbol]()
    } else {
      extras = args
    }
    if (extras.length) {
      con[methodName](...extras)
      this[incLogCallCountSymbol]()
    }
    return this
  }

  #symbolApply(symbolType, args) {
    let extras
    let text = args.at(0)
    if (typeof text === 'string') {
      extras = args.slice(1)
    } else {
      extras = args
      text = ''
    }
    const con = privateConsole.get(this)
    // Note: meta status messages (info/fail/etc) always go to stderr
    con.error(`${this.#indention}${LOG_SYMBOLS[symbolType]} ${text}`)
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
  }

  dedent(spaces = 2) {
    this.#indention = this.#indention.slice(0, -spaces)
    return this
  }

  error(...args) {
    return this.#apply('error', args)
  }

  fail(...args) {
    return this.#symbolApply('fail', args)
  }

  group(...label) {
    const con = privateConsole.get(this)
    if (label.length) {
      con.group(...label)
      this[incLogCallCountSymbol]()
    } else {
      con.group()
    }
    return this
  }

  indent(spaces = 2) {
    this.#indention += ' '.repeat(spaces)
    return this
  }

  info(...args) {
    return this.#symbolApply('info', args)
  }

  log(...args) {
    return this.#apply('log', args)
  }

  resetIndent() {
    this.#indention = ''
    return this
  }

  success(...args) {
    return this.#symbolApply('success', args)
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
          Symbol.toStringTag,
          {
            __proto__: null,
            configurable: true,
            value: 'logger'
          }
        ]
      ]
      for (const { 0: key, 1: value } of Object.entries(console)) {
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
  LOG_SYMBOLS,
  Logger,
  logger
}
