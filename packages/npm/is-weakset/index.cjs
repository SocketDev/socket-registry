'use strict'

const { isWeakSet: nodeIsWeakSet } = /*@__PURE__*/ require('node:util/types')

module.exports = function isWeakSet(value) {
  return nodeIsWeakSet(value)
}
