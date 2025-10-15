'use strict'

const nodeUtilTypes = /*@__PURE__*/ require('node:util/types')
const isBigIntObject = nodeUtilTypes.isBigIntObject

module.exports = function isBigInt(value) {
  return typeof value === 'bigint' || isBigIntObject(value)
}
