'use strict'

const getPolyfill = require('./polyfill')
const polyfill = getPolyfill()

const desc = value => ({
  __proto__: null,
  configurable: true,
  value,
  writable: true
})

module.exports = Object.defineProperties(
  function filter(thisArg, predicate) {
    return new.target
      ? new polyfill()
      : Reflect.apply(polyfill, thisArg, [predicate])
  },
  {
    getPolyfill: desc(getPolyfill),
    implementation: desc(require('./implementation')),
    shim: desc(require('./shim'))
  }
)
module.exports.getPolyfill = module.exports.getPolyfill
module.exports.implementation = module.exports.implementation
module.exports.shim = module.exports.shim
