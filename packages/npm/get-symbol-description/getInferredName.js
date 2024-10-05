'use strict'

const getSymbolDescription = require('./index')

module.exports = function getInferredName(sym) {
  return `[${getSymbolDescription(sym)}]`
}
