'use strict'

const impl = require('./implementation')

const desc = value => ({
  __proto__: null,
  configurable: true,
  value,
  writable: true
})

module.exports = Object.defineProperties(
  function drop(thisArg, limit = 0) {
    return new.target ? impl() : Reflect.apply(impl, thisArg, [limit])
  },
  {
    getPolyfill: desc(require('./polyfill')),
    implementation: desc(impl),
    shim: desc(require('./shim'))
  }
)
module.exports.getPolyfill = module.exports.getPolyfill
module.exports.implementation = module.exports.implementation
module.exports.shim = module.exports.shim
