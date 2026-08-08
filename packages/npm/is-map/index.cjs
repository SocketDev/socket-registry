'use strict'

const { isMap: nodeIsMap } = /*@__PURE__*/ require('node:util/types')

module.exports = function isMap(value) {
  return nodeIsMap(value)
}
