'use strict'

const getPolyfill = require('./polyfill')
const Iterator = require('../Iterator/implementation')

const { defineProperty: ObjectDefineProperty } = Object

module.exports = function shimIteratorFrom() {
  const polyfill = getPolyfill()
  if (Iterator.from !== polyfill) {
    ObjectDefineProperty(Iterator, 'from', {
      __proto__: null,
      configurable: true,
      enumerable: false,
      value: polyfill,
      writable: true
    })
  }
  return polyfill
}
