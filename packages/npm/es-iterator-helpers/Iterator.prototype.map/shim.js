'use strict'

const getPolyfill = require('./polyfill')
const IteratorPrototype = require('../Iterator.prototype/implementation')

const { defineProperty: ObjectDefineProperty } = Object

module.exports = function shimIteratorProtoMap() {
  const polyfill = getPolyfill()
  if (polyfill && IteratorPrototype.map !== polyfill) {
    ObjectDefineProperty(IteratorPrototype, 'map', {
      __proto__: null,
      configurable: true,
      enumerable: false,
      value: polyfill,
      writable: true
    })
  }
  return polyfill
}
