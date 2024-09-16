'use strict'

const impl = require('./implementation')
const desc = value => ({
  __proto__: null,
  configurable: true,
  writable: true,
  value
})

module.exports = Object.defineProperties(
  function toSorted(thisArg, compareFn) {
    return new.target
      ? impl(compareFn)
      : Reflect.apply(impl, thisArg, [compareFn])
  },
  {
    getPolyfill: desc(require('./polyfill')),
    implementation: desc(impl),
    shim: desc(require('./shim'))
  }
)
