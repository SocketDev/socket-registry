'use strict'

const { toString: fnToStr } = Function.prototype
const genFuncProto = function* () {}.prototype
const { apply: ReflectApply, getPrototypeOf: ReflectGetPrototypeOf } = Reflect
const { test: RegExpProtoTest } = RegExp.prototype
const isFnRegExp = /^\s*(?:function)?\*/

module.exports = function isGeneratorFunction(fn) {
  return (
    typeof fn === 'function' &&
    (ReflectApply(RegExpProtoTest, isFnRegExp, [
      ReflectApply(fnToStr, fn, [])
    ]) ||
      ReflectGetPrototypeOf(fn) === genFuncProto)
  )
}
