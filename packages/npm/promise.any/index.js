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
  function any(iterable) {
    return new.target
      ? new impl()
      : Reflect.apply(impl, typeof this === 'undefined' ? Promise : this, [
          iterable,
        ])
  },
  {
    getPolyfill: desc(require('./polyfill')),
    implementation: desc(impl),
    shim: desc(require('./shim')),
  },
)
