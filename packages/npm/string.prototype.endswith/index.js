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
  function endsWith(thisArg, searchString, endPosition = thisArg.length) {
    return new.target
      ? new impl()
      : Reflect.apply(impl, thisArg, [searchString, endPosition])
  },
  {
    getPolyfill: desc(require('./polyfill')),
    implementation: desc(impl),
    shim: desc(require('./shim')),
  },
)
