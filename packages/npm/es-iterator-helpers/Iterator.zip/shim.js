'use strict'

const getPolyfill = require('./polyfill')
const IteratorCtor = require('../Iterator/implementation')

const { defineProperty: ObjectDefineProperty } = Object

module.exports = function shimIteratorZip() {
  const polyfill = getPolyfill()
  if (IteratorCtor.zip !== polyfill) {
    ObjectDefineProperty(IteratorCtor, 'zip', {
      __proto__: null,
      configurable: true,
      enumerable: false,
      value: polyfill,
      writable: true,
    })
  }
  return polyfill
}
