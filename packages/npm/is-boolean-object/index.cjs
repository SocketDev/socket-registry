'use strict'

// eslint-disable-next-line n/prefer-node-protocol
const nodeUtilTypes = /*@__PURE__*/ require('util/types')
const isBooleanObject = nodeUtilTypes.isBooleanObject

module.exports = function isBoolean(value) {
  return typeof value === 'boolean' || isBooleanObject(value)
}
