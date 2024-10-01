'use strict'

const { defineProperty: ObjectDefineProperty, hasOwn: ObjectHasOwn } = Object

module.exports = function setToStringTag(object, value, options) {
  if (
    { __proto__: null, ...options }.force ||
    !ObjectHasOwn(object, Symbol.toStringTag)
  ) {
    ObjectDefineProperty(object, Symbol.toStringTag, {
      __proto__: null,
      configurable: true,
      value
    })
  }
}
