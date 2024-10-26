'use strict'

const getPolyfill = require('./polyfill')
const { IteratorPrototype, ObjectDefineProperty } = require('../shared')

module.exports = function shimIteratorProtoFilter() {
  const polyfill = getPolyfill()
  if (IteratorPrototype.filter !== polyfill) {
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
