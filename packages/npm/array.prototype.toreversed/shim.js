'use strict'

const getPolyfill = require('./polyfill')

const { defineProperty: ObjectDefineProperty } = Object
const map = Array.prototype[Symbol.unscopables]

module.exports = function shimArrayProtoToReversed() {
  const polyfill = getPolyfill()
  if (Array.prototype.toReversed !== polyfill) {
    ObjectDefineProperty(Array.prototype, 'toReversed', {
      __proto__: null,
      configurable: true,
      enumerable: false,
      value: polyfill,
      writable: true
    })
  }
  map['toReversed'] = true
  return polyfill
}
