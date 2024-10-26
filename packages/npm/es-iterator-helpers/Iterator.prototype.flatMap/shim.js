'use strict'

const getPolyfill = require('./polyfill')
const { IteratorPrototype, ObjectDefineProperty } = require('../shared')

module.exports = function shimIteratorProtoFlatMap() {
  const polyfill = getPolyfill()
  if (IteratorPrototype.flatMap !== polyfill) {
    ObjectDefineProperty(IteratorPrototype, 'flatMap', {
      __proto__: null,
      configurable: true,
      enumerable: false,
      value: polyfill,
      writable: true
    })
  }
  return polyfill
}
