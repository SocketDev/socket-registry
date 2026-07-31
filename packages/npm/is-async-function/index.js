'use strict'

const { toString: fnToStr } = Function.prototype
const asyncFuncProto = Object.getPrototypeOf(async function () {})
const { apply: ReflectApply, getPrototypeOf: ReflectGetPrototypeOf } = Reflect
const { test: RegExpProtoTest } = RegExp.prototype
// Source text of an async function, as `Function.prototype.toString` renders
// it. Two shapes reach here: an arrow or method, `async (`, where the space is
// optional; and a declaration or expression, `async function (`, where at
// least one space separates the keywords and the name is optional. Alternation
// branches are sorted alphanumerically (socket/sort-regex-alternations); the
// order is behaviour-neutral because the two branches cannot both match, `\s*\(`
// requires a paren where `\s+function` requires the keyword.
const isFnRegExp = /^\s*async(?:\s*\(|\s+function(?:\(|\s+))/

module.exports = function isAsyncFunction(fn) {
  return (
    typeof fn === 'function' &&
    (ReflectApply(RegExpProtoTest, isFnRegExp, [
      ReflectApply(fnToStr, fn, []),
    ]) ||
      ReflectGetPrototypeOf(fn) === asyncFuncProto)
  )
}
