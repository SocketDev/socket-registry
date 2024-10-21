'use strict'

const getPolyfill = require('./polyfill')
const polyfill = getPolyfill()

const desc = value => ({
  __proto__: null,
  configurable: true,
  value,
  writable: true
})

module.exports = Object.defineProperties(
  function groupBy(items, callbackFn) {
    return new.target ? polyfill() : polyfill(items, callbackFn)
  },
  {
    getPolyfill: desc(getPolyfill),
    implementation: desc(require('./implementation')),
    shim: desc(require('./shim'))
  }
)
module.exports.getPolyfill = module.exports.getPolyfill
module.exports.implementation = module.exports.implementation
module.exports.shim = module.exports.shim
