'use strict'

const isSymbol = require('./is-symbol')

module.exports = function validateSymbol(value) {
  if (!isSymbol(value)) {
    throw new TypeError(String(value) + ' is not a symbol')
  }
  return value
}
