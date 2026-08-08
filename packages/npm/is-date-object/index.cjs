'use strict'

const { isDate: nodeIsDate } = /*@__PURE__*/ require('node:util/types')

module.exports = function isDateObject(value) {
  return nodeIsDate(value)
}
