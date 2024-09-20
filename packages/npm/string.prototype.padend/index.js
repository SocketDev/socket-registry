'use strict'

const impl = require('./implementation')

const desc = value => ({
  __proto__: null,
  configurable: true,
  value,
  writable: true
})

module.exports = Object.defineProperties(
  function padEnd(thisArg, targetLength, padString = ' ') {
    return new.target
      ? new impl()
      : Reflect.apply(impl, thisArg, [targetLength, padString])
  },
  {
    getPolyfill: desc(require('./polyfill')),
    implementation: desc(impl),
    shim: desc(require('./shim'))
  }
)
module.exports.getPolyfill = module.exports.getPolyfill
module.exports.implementation = module.exports.implementation
module.exports.shim = module.exports.shim
