'use strict'

const getPolyfill = require('./polyfill')
const { IteratorPrototype, ObjectDefineProperty } = require('../shared')

module.exports = function shimIteratorProtoTake() {
  const polyfill = getPolyfill()
  if (IteratorPrototype.take !== polyfill) {
    ObjectDefineProperty(IteratorPrototype, 'take', {
      __proto__: null,
      configurable: true,
      enumerable: false,
      value: polyfill,
      writable: true
    })
  }
  return polyfill
}
