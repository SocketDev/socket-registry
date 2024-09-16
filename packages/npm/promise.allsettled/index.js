'use strict'

const impl = require('./implementation')
const desc = value => ({
  __proto__: null,
  configurable: true,
  writable: true,
  value
})

module.exports = Object.defineProperties(
  function allSettled(iterable) {
    return new.target
      ? new impl()
      : Reflect.apply(impl, typeof this === 'undefined' ? Promise : this, [
          iterable
        ])
  },
  {
    getPolyfill: desc(require('./polyfill')),
    implementation: desc(impl),
    shim: desc(require('./shim'))
  }
)
