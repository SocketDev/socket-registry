'use strict'

const { isSymbolObject } = require('node:util/types')

module.exports = function isSymbol(value) {
  return typeof value === 'symbol' || isSymbolObject(value)
}
