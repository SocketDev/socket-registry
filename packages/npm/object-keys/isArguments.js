'use strict'

const { toString: objToStr } = Object.prototype

module.exports = function isArguments(value) {
  if (
    value === null ||
    typeof value !== 'object' ||
    Symbol.toStringTag in value
  ) {
    return false
  }
  if (objToStr.call(value) === '[object Arguments]') {
    return true
  }
  return (
    typeof value.length === 'number' &&
    value.length >= 0 &&
    typeof value.callee === 'function' &&
    !Array.isArray(value)
  )
}
