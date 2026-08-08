'use strict'

module.exports = function getRegExpMatchAllPolyfill() {
  return RegExp.prototype[Symbol.matchAll]
}
