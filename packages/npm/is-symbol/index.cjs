'use strict'

// eslint-disable-next-line n/prefer-node-protocol
const nodeUtilTypes = /*@__PURE__*/ require('util/types')
const isSymbolObject = nodeUtilTypes.isSymbolObject

module.exports = function isSymbol(value) {
  return typeof value === 'symbol' || isSymbolObject(value)
}
