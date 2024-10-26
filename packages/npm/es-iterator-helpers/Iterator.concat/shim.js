'use strict'

const getPolyfill = require('./polyfill')
const IteratorCtor = require('../Iterator/implementation')

const { defineProperty: ObjectDefineProperty } = Object

module.exports = function shimIteratorConcat() {
  const polyfill = getPolyfill()
  if (IteratorCtor.concat !== polyfill) {
    ObjectDefineProperty(IteratorCtor, 'concat', {
      __proto__: null,
      configurable: true,
      enumerable: false,
      value: polyfill,
      writable: true
    })
  }
  return polyfill
}
