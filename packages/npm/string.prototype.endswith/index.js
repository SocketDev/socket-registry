'use strict'

const impl = require('./implementation')
const desc = value => ({
  __proto__: null,
  configurable: true,
  writable: true,
  value
})

module.exports = Object.defineProperties(
  function endsWith(thisArg, searchString, endPosition = thisArg.length) {
    return new.target
      ? new impl()
      : Reflect.apply(impl, thisArg, [searchString, endPosition])
  },
  {
    getPolyfill: desc(require('./polyfill')),
    implementation: desc(impl),
    shim: desc(require('./shim'))
  }
)
