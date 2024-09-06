'use strict'

const impl = require('./implementation')
const desc = value => ({
  __proto__: null,
  configurable: true,
  writable: true,
  value
})

module.exports = Object.defineProperties(
  function startsWith(thisArg, searchString, position = 0) {
    return Reflect.apply(impl, thisArg, [searchString, position])
  },
  {
    getPolyfill: desc(require('./polyfill')),
    implementation: desc(impl),
    shim: desc(require('./shim'))
  }
)
