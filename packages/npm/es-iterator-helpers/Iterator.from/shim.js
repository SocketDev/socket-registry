'use strict'

const getPolyfill = require('./polyfill')
const IteratorCtor = require('../Iterator/implementation')

const { defineProperty: ObjectDefineProperty } = Object

module.exports = function shimIteratorFrom() {
  const polyfill = getPolyfill()
  if (IteratorCtor.from !== polyfill) {
    ObjectDefineProperty(IteratorCtor, 'from', {
      __proto__: null,
      configurable: true,
      enumerable: false,
      value: polyfill,
      writable: true
    })
  }
  return polyfill
}
