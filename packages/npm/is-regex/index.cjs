'use strict'

const { isRegExp: nodeIsRegExp } = /*@__PURE__*/ require('node:util/types')

module.exports = function isRegex(value) {
  return nodeIsRegExp(value)
}
