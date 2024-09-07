'use strict'

const impl = require('./implementation')
const desc = value => ({
  __proto__: null,
  configurable: true,
  writable: true,
  value
})

module.exports = Object.defineProperties(
  function at(thisArg, index) {
    return Reflect.apply(impl, thisArg, [index])
  },
  {
    getPolyfill: desc(require('./polyfill')),
    implementation: desc(impl),
    shim: desc(require('./shim'))
  }
)
