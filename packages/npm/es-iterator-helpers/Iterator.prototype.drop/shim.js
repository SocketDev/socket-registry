'use strict'

const getPolyfill = require('./polyfill')
const IteratorPrototype = require('../Iterator.prototype/implementation')

const { defineProperty: ObjectDefineProperty } = Object

module.exports = function shimIteratorProtoDrop() {
  const polyfill = getPolyfill()
  if (polyfill && IteratorPrototype.drop !== polyfill) {
    ObjectDefineProperty(IteratorPrototype, 'drop', {
      __proto__: null,
      configurable: true,
      enumerable: false,
      value: polyfill,
      writable: true
    })
  }
  return polyfill
}
