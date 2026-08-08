'use strict'

const {
  isSharedArrayBuffer: nodeIsSharedArrayBuffer,
} = /*@__PURE__*/ require('node:util/types')

module.exports = function isSharedArrayBuffer(value) {
  return nodeIsSharedArrayBuffer(value)
}
