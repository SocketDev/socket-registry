'use strict'

const getPolyfill = require('./polyfill')
const Iterator = require('../Iterator/implementation')

const { defineProperty: ObjectDefineProperty } = Object

module.exports = function shimIteratorProto() {
  const polyfill = getPolyfill()
  if (Iterator.prototype !== polyfill) {
    ObjectDefineProperty(Iterator, 'prototype', {
      __proto__: null,
      configurable: true,
      enumerable: false,
      value: polyfill,
      writable: true
    })
  }
  return polyfill
}
