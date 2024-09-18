'use strict'

const { promisify: builtinPromisify } = require('node:util')

const impl = require('./implementation')
const desc = value => ({
  __proto__: null,
  configurable: true,
  writable: true,
  value
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
