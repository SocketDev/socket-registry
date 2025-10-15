'use strict'

const nodeUtilTypes = /*@__PURE__*/ require('node:util/types')
const isBooleanObject = nodeUtilTypes.isBooleanObject

module.exports = function isBoolean(value) {
  return typeof value === 'boolean' || isBooleanObject(value)
}
