'use strict'

const { isWeakMap: nodeIsWeakMap } = /*@__PURE__*/ require('node:util/types')

module.exports = function isWeakMap(value) {
  return nodeIsWeakMap(value)
}
