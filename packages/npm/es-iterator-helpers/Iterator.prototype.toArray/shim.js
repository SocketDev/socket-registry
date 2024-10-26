'use strict'

const getPolyfill = require('./polyfill')
const { IteratorPrototype, ObjectDefineProperty } = require('../shared')

module.exports = function shimIteratorProtoToArray() {
  const polyfill = getPolyfill()
  if (IteratorPrototype.toArray !== polyfill) {
    ObjectDefineProperty(IteratorPrototype, 'toArray', {
      __proto__: null,
      configurable: true,
      enumerable: false,
      value: polyfill,
      writable: true
    })
  }
  return polyfill
}
