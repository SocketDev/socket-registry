'use strict'

const { promisify: builtinPromisify } = require('node:util')

const impl = require('./implementation')

const desc = value => ({
  __proto__: null,
  configurable: true,
  value,
  writable: true
})

module.exports = Object.defineProperties(
  function promisify(original) {
    return builtinPromisify(original)
  },
  {
    custom: desc(impl.custom),
    customPromisifyArgs: desc(impl.customPromisifyArgs),
    getPolyfill: desc(require('./polyfill')),
    implementation: desc(impl),
    shim: desc(require('./shim'))
  }
)
module.exports.custom = module.exports.custom
module.exports.customPromisifyArgs = module.exports.customPromisifyArgs
module.exports.getPolyfill = module.exports.getPolyfill
module.exports.implementation = module.exports.implementation
module.exports.shim = module.exports.shim
