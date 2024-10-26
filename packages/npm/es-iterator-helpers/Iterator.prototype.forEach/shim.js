'use strict'

const getPolyfill = require('./polyfill')
const { IteratorPrototype, ObjectDefineProperty } = require('../shared')

module.exports = function shimIteratorProtoForEach() {
  const polyfill = getPolyfill()
  if (IteratorPrototype.forEach !== polyfill) {
    ObjectDefineProperty(IteratorPrototype, 'forEach', {
      __proto__: null,
      configurable: true,
      enumerable: false,
      value: polyfill,
      writable: true
    })
  }
  return polyfill
}
