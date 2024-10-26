'use strict'

const getPolyfill = require('./polyfill')
const IteratorCtor = require('../Iterator/implementation')

const { defineProperty: ObjectDefineProperty } = Object

module.exports = function shimIteratorProto() {
  const polyfill = getPolyfill()
  if (IteratorCtor.prototype !== polyfill) {
    ObjectDefineProperty(IteratorCtor, 'prototype', {
      __proto__: null,
      configurable: true,
      enumerable: false,
      value: polyfill,
      writable: true
    })
  }
  return polyfill
}
