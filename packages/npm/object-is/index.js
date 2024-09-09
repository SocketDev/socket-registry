'use strict'

const impl = require('./implementation')
const desc = value => ({
  __proto__: null,
  configurable: true,
  writable: true,
  value
})

module.exports = Object.defineProperties(
  function is(value1, value2) {
    return impl(value1, value2)
  },
  {
    getPolyfill: desc(require('./polyfill')),
    implementation: desc(impl),
    shim: desc(require('./shim'))
  }
)
