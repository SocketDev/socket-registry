'use strict'

let _logSymbols
function getLogSymbols() {
  if (_logSymbols === undefined) {
    const supported = require('@socketregistry/is-unicode-supported')()
    const colors = getYoctocolors()
    _logSymbols = {
      error: colors.red(supported ? '✖️' : '×'),
      info: colors.blue(supported ? 'ℹ' : 'i'),
      success: colors.green(supported ? '✔' : '√'),
      warning: colors.yellow(supported ? '⚠' : '‼')
    }
  }
  return _logSymbols
}

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
    const symbols = getLogSymbols()
    console.log(`${symbols[symbolType]} ${text}`)
    if (extras.length) {
      console.log(...extras)
    }
    return this
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
