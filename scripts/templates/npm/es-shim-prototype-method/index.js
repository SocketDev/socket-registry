'use strict'

const impl = require('./implementation')

const desc = value => ({
  __proto__: null,
  configurable: true,
  value,
  writable: true,
})

module.exports = Object.defineProperties(
  // TODO: Rename function.
  function RenameProtoMethod(thisArg, ...args) {
    return new.target ? new impl() : Reflect.apply(impl, thisArg, args)
  },
  {
    getPolyfill: desc(require('./polyfill')),
    implementation: desc(impl),
    shim: desc(require('./shim')),
  },
)
// eslint-disable-next-line no-self-assign -- CJS named export hints.
module.exports.getPolyfill = module.exports.getPolyfill
// eslint-disable-next-line no-self-assign -- CJS named export hints.
module.exports.implementation = module.exports.implementation
// eslint-disable-next-line no-self-assign -- CJS named export hints.
module.exports.shim = module.exports.shim
