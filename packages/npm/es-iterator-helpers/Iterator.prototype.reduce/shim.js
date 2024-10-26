'use strict'

const getPolyfill = require('./polyfill')
const { IteratorPrototype, ObjectDefineProperty } = require('../shared')

module.exports = function shimIteratorProtoReduce() {
  const polyfill = getPolyfill()
  if (IteratorPrototype.reduce !== polyfill) {
    ObjectDefineProperty(IteratorPrototype, 'reduce', {
      __proto__: null,
      configurable: true,
      enumerable: false,
      value: polyfill,
      writable: true
    })
  }
  return polyfill
}
