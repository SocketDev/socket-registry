'use strict'

const getPolyfill = require('./polyfill')
const IteratorPrototype = require('../Iterator.prototype/implementation')

const { defineProperty: ObjectDefineProperty } = Object

module.exports = function shimIteratorProtoFilter() {
  const polyfill = getPolyfill()
  if (polyfill && IteratorPrototype.filter !== polyfill) {
    ObjectDefineProperty(IteratorPrototype, 'filter', {
      __proto__: null,
      configurable: true,
      enumerable: false,
      value: polyfill,
      writable: true
    })
  }
  return polyfill
}
