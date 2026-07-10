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
  function toReversed(thisArg) {
    return new.target ? new polyfill() : Reflect.apply(polyfill, thisArg, [])
  },
  {
    getPolyfill: desc(getPolyfill),
    implementation: desc(require('./implementation')),
    shim: desc(require('./shim')),
  },
)
