'use strict'

const nodeUtilTypes = /*@__PURE__*/ require('node:util/types')
const isStringObject = nodeUtilTypes.isStringObject

module.exports = function isString(value) {
  return typeof value === 'string' || isStringObject(value)
}
