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
  function promisify(original) {
    return impl(original)
  },
  {
    custom: desc(impl.custom),
    customPromisifyArgs: desc(impl.customPromisifyArgs),
    getPolyfill: desc(require('./polyfill')),
    implementation: desc(impl),
    shim: desc(require('./shim')),
  },
)
