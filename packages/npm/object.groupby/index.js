'use strict'

const getPolyfill = require('./polyfill')
const polyfill = getPolyfill()

function desc(value) {
  return {
    __proto__: null,
    configurable: true,
    value,
    writable: true,
  }
}

module.exports = Object.defineProperties(
  function groupBy(items, callbackFn) {
    return new.target ? polyfill() : polyfill(items, callbackFn)
  },
  {
    getPolyfill: desc(getPolyfill),
    implementation: desc(require('./implementation')),
    shim: desc(require('./shim')),
  },
)
