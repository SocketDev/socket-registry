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
      handler[trapName] = function (...args) {
        init()
        return fn(...args)
      }
    }
  }
  return new Proxy(target, handler)
})()

const boundConsoleMethods = new Map(
  ['debug', 'dir', 'dirxml', 'error', 'info', 'log', 'trace', 'warn'].map(n => [
    n,
    console[n].bind(console)
  ])
)

const privateConsole = new WeakMap()

const symbolTypeToMethodName = {
  fail: 'error',
  info: 'info',
  success: 'log',
  warn: 'warn'
}

/*@__PURE__*/
class Logger {
  static LOG_SYMBOLS = LOG_SYMBOLS

  #indention = ''

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
      for (const { 0: key, 1: method } of boundConsoleMethods) {
        newConsole[key] = method
      }
      privateConsole.set(this, newConsole)
    }
  }

  #apply(methodName, args) {
    const text = args.at(0)
    const console = privateConsole.get(this)
    let extras
    if (typeof text === 'string') {
      extras = args.slice(1)
      console[methodName](`${this.#indention}${text}`)
    } else {
      extras = args
    }
    if (extras.length) {
      console[methodName](...extras)
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
    const methodName = symbolTypeToMethodName[symbolType]
    const console = privateConsole.get(this)
    console[methodName](`${this.#indention}${LOG_SYMBOLS[symbolType]} ${text}`)
    if (extras.length) {
      console[methodName](...extras)
    }
    return this
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

const mixinKeys = []
for (const { 0: key, 1: value } of Object.entries(console)) {
  if (!Logger.prototype[key] && typeof value === 'function') {
    mixinKeys.push(key)
  }
}
mixinKeys.push(
  ...Object.getOwnPropertySymbols(console).filter(s => s !== Symbol.toStringTag)
)
if (mixinKeys.length) {
  Object.defineProperties(
    Logger.prototype,
    Object.fromEntries([
      ...mixinKeys.map(key => [
        key,
        {
          __proto__: null,
          configurable: true,
          value: function (...args) {
            const console = privateConsole.get(this)
            const result = console[key](...args)
            return result === undefined ? this : result
          },
          writable: true
        }
      ]),
      [
        Symbol.toStringTag,
        {
          __proto__: null,
          configurable: true,
          value: 'logger'
        }
      ]
    ])
  )
}

const logger = new Logger()

module.exports = {
  LOG_SYMBOLS,
  Logger,
  logger
}
