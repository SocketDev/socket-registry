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

  #symbolApply(symbolType, args) {
    let extras
    let text = args.at(0) ?? ''
    if (typeof text !== 'string') {
      text = ''
      extras = args
    } else {
      extras = args.slice(1)
    }
    const methodName = symbolTypeToMethodName[symbolType]
    const console = privateConsole.get(this)
    console[methodName](`${LOG_SYMBOLS[symbolType]} ${text}`)
    if (extras.length) {
      console[methodName](...extras)
    }
    return this
  }

  fail(...args) {
    return this.#symbolApply('fail', args)
  }

  info(...args) {
    return this.#symbolApply('info', args)
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

if (mixinKeys.length) {
  Object.defineProperties(
    Logger.prototype,
    Object.fromEntries(
      mixinKeys.map(key => [
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
      ])
    )
  )
}

const logger = new Logger()

module.exports = {
  LOG_SYMBOLS,
  Logger,
  logger
}
