'use strict'

const { toString: objToStr } = Object.prototype

function innerIsArguments(value, useLegacyFallback = false) {
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
    useLegacyFallback &&
    typeof value.length === 'number' &&
    value.length >= 0 &&
    typeof value.callee === 'function' &&
    !Array.isArray(value)
  )
}

module.exports = function isArguments(value) {
  return innerIsArguments(value)
}
// Undocumented export for unit tests.
module.exports.isLegacyArguments = function isArguments(value) {
  return innerIsArguments(value, true)
}
