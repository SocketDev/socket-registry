'use strict'

// eslint-disable-next-line n/prefer-node-protocol
const nodeUtilTypes = /*@__PURE__*/ require('util/types')
const isStringObject = nodeUtilTypes.isStringObject

module.exports = function isString(value) {
  return typeof value === 'string' || isStringObject(value)
}
