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
  function forEach(thisArg, ...args) {
    if (new.target) {
      // Upstream constructor-guard side effect (throws); the constructed
      // value is intentionally discarded.
      // oxlint-disable-next-line no-new -- side effect
      new impl(...args)
    } else {
      Reflect.apply(impl, thisArg, args)
    }
  },
  {
    getPolyfill: desc(require('./polyfill')),
    implementation: desc(impl),
    shim: desc(require('./shim')),
  },
)
