'use strict'

const getPolyfill = require('./polyfill')
const { IteratorPrototype, ObjectDefineProperty } = require('../shared')

module.exports = function shimIteratorProtoConstructor() {
  const polyfill = getPolyfill()
  if (IteratorPrototype.constructor !== polyfill) {
    ObjectDefineProperty(IteratorPrototype, 'constructor', {
      __proto__: null,
      configurable: true,
      enumerable: false,
      value: polyfill,
      writable: true
    })
  }
  return polyfill
}
