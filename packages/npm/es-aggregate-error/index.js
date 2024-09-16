'use strict'

const Impl = require('./implementation')
const desc = value => ({
  __proto__: null,
  configurable: true,
  writable: true,
  value
})

module.exports = Object.defineProperties(
  Object.defineProperty(
    function AggregateError(errors, message) {
      return new.target ? new Impl(errors, message) : Impl(errors, message)
    },
    'prototype',
    {
      __proto__: null,
      value: Impl.prototype,
      writable: false
    }
  ),
  {
    getPolyfill: desc(require('./polyfill')),
    implementation: desc(Impl),
    shim: desc(require('./shim'))
  }
)
