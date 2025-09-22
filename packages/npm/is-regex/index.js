'use strict'

const { exec } = RegExp.prototype
const patternThrowsMarker = {
  __proto__: null,
  [Symbol.toPrimitive]() {
    throw this
  },
}
module.exports = function isRegex(value) {
  if (value !== null && typeof value === 'object') {
    try {
      exec.call(value, patternThrowsMarker)
    } catch (e) {
      return e === patternThrowsMarker
    }
  }
  return false
}
