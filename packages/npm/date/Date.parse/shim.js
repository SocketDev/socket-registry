'use strict'

const getPolyfill = require('./polyfill')

module.exports = function shimDateParse() {
  const polyfill = getPolyfill()
  if (polyfill && Date.parse !== polyfill) {
    Object.defineProperty(Date, 'parse', {
      __proto__: null,
      configurable: true,
      enumerable: false,
      value: polyfill,
      writable: true
    })
  }
  return polyfill
}
