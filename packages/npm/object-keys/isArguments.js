'use strict'

const { isArray: ArrayIsArray } = Array
const { toString: objToStr } = Object.prototype
const { apply: ReflectApply } = Reflect
const { toStringTag: SymbolToStringTag } = Symbol

module.exports = function isArguments(value) {
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
    typeof value.length === 'number' &&
    value.length >= 0 &&
    typeof value.callee === 'function' &&
    !ArrayIsArray(value)
  )
}
