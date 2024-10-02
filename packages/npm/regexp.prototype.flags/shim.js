'use strict'

const getPolyfill = require('./polyfill')

const { defineProperty: ObjectDefineProperty } = Object
const { __lookupGetter__: ObjectProtoLookupGetter } = Object.prototype
const { prototype: RegExpPrototype } = RegExp

module.exports = function shimRegExpProtoFlags() {
  const polyfill = getPolyfill()
  if (ObjectProtoLookupGetter.call(RegExpPrototype, 'flags') !== polyfill) {
    ObjectDefineProperty(RegExpPrototype, 'flags', {
      __proto__: null,
      configurable: true,
      enumerable: false,
      get: polyfill
    })
  }
  return polyfill
}
