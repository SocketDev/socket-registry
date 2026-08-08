'use strict'

const {
  isArrayBuffer: nodeIsArrayBuffer,
} = /*@__PURE__*/ require('node:util/types')

module.exports = function isArrayBuffer(value) {
  return nodeIsArrayBuffer(value)
}
