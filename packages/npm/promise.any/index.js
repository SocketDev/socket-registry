'use strict'

const impl = require('./implementation')

const desc = value => ({
  __proto__: null,
  configurable: true,
  value,
  writable: true,
})

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
module.exports.getPolyfill = module.exports.getPolyfill
module.exports.implementation = module.exports.implementation
module.exports.shim = module.exports.shim
