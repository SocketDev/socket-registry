'use strict'

const impl = require('./implementation')
const desc = value => ({
  __proto__: null,
  configurable: true,
  writable: true,
  value
})

module.exports = Object.defineProperties(
  // TODO: Rename function.
  function RenameProtoMethod(thisArg, ...args) {
    return new.target ? new impl() : Reflect.apply(impl, thisArg, args)
  },
  {
    getPolyfill: desc(require('./polyfill')),
    implementation: desc(impl),
    shim: desc(require('./shim'))
  }
)
