'use strict'

const nodeUtilTypes = /*@__PURE__*/ require('node:util/types')
const isSymbolObject = nodeUtilTypes.isSymbolObject

module.exports = function isSymbol(value) {
  return typeof value === 'symbol' || isSymbolObject(value)
}
