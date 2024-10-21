'use strict'

const getPolyfill = require('./polyfill')

const { defineProperty: ObjectDefineProperty } = Object

module.exports = function shimObjectGroupBy() {
  const polyfill = getPolyfill()
  if (Object.groupBy !== polyfill) {
    ObjectDefineProperty(Object, 'groupBy', {
      __proto__: null,
      configurable: true,
      enumerable: false,
      value: polyfill,
      writable: true
    })
  }
  return polyfill
}
