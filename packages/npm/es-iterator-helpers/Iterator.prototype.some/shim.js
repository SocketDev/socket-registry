'use strict'

const getPolyfill = require('./polyfill')
const { IteratorPrototype, ObjectDefineProperty } = require('../shared')

module.exports = function shimIteratorProtoSome() {
  const polyfill = getPolyfill()
  if (IteratorPrototype.some !== polyfill) {
    ObjectDefineProperty(IteratorPrototype, 'some', {
      __proto__: null,
      configurable: true,
      enumerable: false,
      value: polyfill,
      writable: true
    })
  }
  return polyfill
}
