'use strict'

// eslint-disable-next-line n/prefer-node-protocol
const nodeUtilTypes = /*@__PURE__*/ require('util/types')
const isBigIntObject = nodeUtilTypes.isBigIntObject

module.exports = function isBigInt(value) {
  return typeof value === 'bigint' || isBigIntObject(value)
}
