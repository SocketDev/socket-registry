'use strict'

const getPolyfill = require('./polyfill')
const { IteratorPrototype, ObjectDefineProperty } = require('../shared')

module.exports = function shimIteratorProtoDrop() {
  const polyfill = getPolyfill()
  if (IteratorPrototype.drop !== polyfill) {
    ObjectDefineProperty(IteratorPrototype, 'drop', {
      __proto__: null,
      configurable: true,
      enumerable: false,
      value: polyfill,
      writable: true
    })
  }
  return polyfill
}
