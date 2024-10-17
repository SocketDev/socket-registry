'use strict'

const getPolyfill = require('./polyfill')
const Iterator = require('../Iterator/implementation')

const { defineProperty: ObjectDefineProperty } = Object

module.exports = function shimIteratorConcat() {
  const polyfill = getPolyfill()
  if (Iterator.concat !== polyfill) {
    ObjectDefineProperty(Iterator, 'concat', {
      __proto__: null,
      configurable: true,
      enumerable: false,
      value: polyfill,
      writable: true
    })
  }
  return polyfill
}
