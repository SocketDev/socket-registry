'use strict'

const getPolyfill = require('./polyfill')
const { IteratorPrototype, ObjectDefineProperty } = require('../shared')

module.exports = function shimIteratorProtoFind() {
  const polyfill = getPolyfill()
  if (IteratorPrototype.find !== polyfill) {
    ObjectDefineProperty(IteratorPrototype, 'find', {
      __proto__: null,
      configurable: true,
      enumerable: false,
      value: polyfill,
      writable: true
    })
  }
  return polyfill
}
