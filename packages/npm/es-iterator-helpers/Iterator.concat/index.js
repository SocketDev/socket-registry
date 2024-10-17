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
  function concat(...args) {
    return new.target ? new polyfill() : polyfill(...args)
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
