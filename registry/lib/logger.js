'use strict'

const { construct: ReflectConstruct } = Reflect

let _Console
function constructConsole(args) {
  if (_Console === undefined) {
    // Use non-'node:' prefixed require to avoid Webpack errors.
    // eslint-disable-next-line n/prefer-node-protocol
    _Console = require('console').Console
  }
  return ReflectConstruct(_Console, args)
}

let _yoctocolors
function getYoctocolors() {
  if (_yoctocolors === undefined) {
    _yoctocolors = { ...require('yoctocolors-cjs') }
  }
  return _yoctocolors
}

const symbolTypeToMethodName = {
  error: 'error',
  info: 'info',
  success: 'log',
  warning: 'warn'
}

const privateConsole = new WeakMap()

class Logger {
  constructor(...args) {
    privateConsole.set(this, args.length ? constructConsole(args) : console)
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
    console[methodName](`${Logger.LOG_SYMBOLS[symbolType]} ${text}`)
    if (extras.length) {
      console[methodName](...extras)
    }
    return this
  }

  static #LOG_SYMBOLS
  static get LOG_SYMBOLS() {
    if (this.#LOG_SYMBOLS === undefined) {
      const supported = require('@socketregistry/is-unicode-supported')()
      const colors = getYoctocolors()
      this.#LOG_SYMBOLS = {
        error: colors.red(supported ? '✖️' : '×'),
        info: colors.blue(supported ? 'ℹ' : 'i'),
        success: colors.green(supported ? '✔' : '√'),
        warning: colors.yellow(supported ? '⚠' : '‼')
      }
    }
    return this.#LOG_SYMBOLS
  }

  error(...args) {
    return this.#symbolApply('error', args)
  }

  info(...args) {
    return this.#symbolApply('info', args)
  }

  success(...args) {
    return this.#symbolApply('success', args)
  }

  warn(...args) {
    return this.#symbolApply('warning', args)
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
  Logger,
  logger
}
