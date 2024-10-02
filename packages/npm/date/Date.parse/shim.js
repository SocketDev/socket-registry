'use strict'

const getPolyfill = require('./polyfill')

const { defineProperty: ObjectDefineProperty } = Object

module.exports = function shimDateParse() {
  const polyfill = getPolyfill()
  if (Date.parse !== polyfill) {
    ObjectDefineProperty(Date, 'parse', {
      __proto__: null,
      configurable: true,
      enumerable: false,
      value: polyfill,
      writable: true
    })
  }
  return polyfill
}
