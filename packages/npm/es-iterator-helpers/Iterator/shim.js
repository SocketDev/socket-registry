'use strict'

const getPolyfill = require('./polyfill')

const { defineProperty: ObjectDefineProperty } = Object

module.exports = function shimIterator() {
  const polyfill = getPolyfill()
  if (globalThis.Iterator !== polyfill) {
    ObjectDefineProperty(globalThis, 'Iterator', {
      __proto__: null,
      configurable: true,
      enumerable: false,
      value: polyfill,
      writable: true
    })
  }
  return polyfill
}
