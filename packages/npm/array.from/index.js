'use strict'

const impl = require('./implementation')
const desc = value => ({
  __proto__: null,
  configurable: true,
  writable: true,
  value
})

module.exports = Object.defineProperties(
  function from(arrayLike, ...args) {
    return new.target
      ? new impl()
      : Reflect.apply(impl, this ?? Array, [arrayLike, ...args])
  },
  {
    getPolyfill: desc(require('./polyfill')),
    implementation: desc(impl),
    shim: desc(require('./shim'))
  }
)
