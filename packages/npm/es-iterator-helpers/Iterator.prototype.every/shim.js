'use strict'

const getPolyfill = require('./polyfill')
const { IteratorPrototype, ObjectDefineProperty } = require('../shared')

module.exports = function shimIteratorProtoEvery() {
  const polyfill = getPolyfill()
  if (IteratorPrototype.every !== polyfill) {
    ObjectDefineProperty(IteratorPrototype, 'every', {
      __proto__: null,
      configurable: true,
      enumerable: false,
      value: polyfill,
      writable: true
    })
  }
  return polyfill
}
