'use strict'

const impl = require('./implementation')
const desc = value => ({
  __proto__: null,
  configurable: true,
  writable: true,
  value
})

module.exports = Object.defineProperties(
  function replaceAll(thisArg, pattern, replacement) {
    return new.target
      ? Reflect.construct(impl, [pattern, replacement])
      : Reflect.apply(impl, thisArg, [pattern, replacement])
  },
  {
    getPolyfill: desc(require('./polyfill')),
    implementation: desc(impl),
    shim: desc(require('./shim'))
  }
)
