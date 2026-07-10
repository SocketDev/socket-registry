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
      // oxlint-disable-next-line no-new -- Upstream constructor-guard side effect (throws); the constructed value is intentionally discarded.
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
