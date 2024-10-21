'use strict'

const getPolyfill = require('./polyfill')

const { defineProperty: ObjectDefineProperty } = Object
const map = Array.prototype[Symbol.unscopables]

module.exports = function shimArrayProtoToSorted() {
  const polyfill = getPolyfill()
  if (Array.prototype.toSorted !== polyfill) {
    ObjectDefineProperty(Array.prototype, 'toSorted', {
      __proto__: null,
      configurable: true,
      enumerable: false,
      value: polyfill,
      writable: true
    })
  }
  map['toSorted'] = true
  return polyfill
}
