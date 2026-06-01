'use strict'

const impl = require('./implementation')

function desc(value) {
  return {
    __proto__: null,
    configurable: true,
    value,
    writable: true,
  }
}

module.exports = Object.defineProperties(
  function getGlobal() {
    return globalThis
  },
  {
    getPolyfill: desc(require('./polyfill')),
    implementation: desc(impl),
    shim: desc(require('./shim')),
  },
)
module.exports.getPolyfill = module.exports.getPolyfill
module.exports.implementation = module.exports.implementation
module.exports.shim = module.exports.shim
