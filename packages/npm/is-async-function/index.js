'use strict'

const { toString: fnToStr } = Function.prototype
const asyncFuncProto = Object.getPrototypeOf(async function () {})
const { apply: ReflectApply, getPrototypeOf: ReflectGetPrototypeOf } = Reflect
const { test: RegExpProtoTest } = RegExp.prototype
const isFnRegExp = /^\s*async(?:\s+function(?:\s+|\()|\s*\()/

module.exports = function isAsyncFunction(fn) {
  return (
    typeof fn === 'function' &&
    (ReflectApply(RegExpProtoTest, isFnRegExp, [
      ReflectApply(fnToStr, fn, []),
    ]) ||
      ReflectGetPrototypeOf(fn) === asyncFuncProto)
  )
}
