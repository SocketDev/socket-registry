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
  function drop(thisArg, limit = 0) {
    return new.target ? polyfill() : Reflect.apply(polyfill, thisArg, [limit])
  },
  {
    getPolyfill: desc(getPolyfill),
    implementation: desc(require('./implementation')),
    shim: desc(require('./shim')),
  },
)
