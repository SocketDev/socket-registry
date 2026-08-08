'use strict'

const { isSet: nodeIsSet } = /*@__PURE__*/ require('node:util/types')

module.exports = function isSet(value) {
  return nodeIsSet(value)
}
