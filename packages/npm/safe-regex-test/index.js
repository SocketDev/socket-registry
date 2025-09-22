'use strict'

const { exec } = RegExp.prototype
const patternThrowsMarker = {
  __proto__: null,
  [Symbol.toPrimitive]() {
    throw this
  },
}
function isRegex(v) {
  try {
    exec.call(v, patternThrowsMarker)
  } catch (e) {
    return e === patternThrowsMarker
  }
  return false
}
module.exports = function regexTester(regex) {
  if (!isRegex(regex)) {
    throw new TypeError('`regex` must be a RegExp')
  }
  return function test(s) {
    return exec.call(regex, s) !== null
  }
}
