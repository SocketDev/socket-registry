'use strict'

const { isArray: ArrayIsArray } = Array
const { toString: objToStr } = Object.prototype
const { apply: ReflectApply } = Reflect
const { toStringTag: SymbolToStringTag } = Symbol

function innerIsArguments(value, useLegacyFallback = false) {
  if (
    value === null ||
    typeof value !== 'object' ||
    SymbolToStringTag in value
  ) {
    return false
  }
  if (ReflectApply(objToStr, value, []) === '[object Arguments]') {
    return true
  }
  return (
    useLegacyFallback &&
    typeof value.length === 'number' &&
    value.length >= 0 &&
    typeof value.callee === 'function' &&
    !ArrayIsArray(value)
  )
}

module.exports = function isArguments(value) {
  return innerIsArguments(value)
}
// Undocumented export for unit tests.
module.exports.isLegacyArguments = function isArguments(value) {
  return innerIsArguments(value, true)
}
