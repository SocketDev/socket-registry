'use strict'

let _yoctocolors
function getYoctocolors() {
  if (_yoctocolors === undefined) {
    _yoctocolors = { ...require('yoctocolors-cjs') }
  }
  return _yoctocolors
}

class Logger {
  #symbolApply(symbolType, args) {
    let extras
    let text = args.at(0) ?? ''
    if (typeof text !== 'string') {
      text = ''
      extras = args
    } else {
      extras = args.slice(1)
    }
    console.log(`${Logger.LOG_SYMBOLS[symbolType]} ${text}`)
    if (extras.length) {
      console.log(...extras)
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

  log(...args) {
    console.log(...args)
    return this
  }

  success(...args) {
    return this.#symbolApply('success', args)
  }

  warn(...args) {
    return this.#symbolApply('warning', args)
  }
}

const logger = new Logger()

module.exports = {
  Logger,
  logger
}
