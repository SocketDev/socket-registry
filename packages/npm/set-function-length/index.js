'use strict'

const { defineProperty: ObjectDefineProperty, getOwnPropertyDescriptor: gOPD } =
  Object

module.exports = function setFunctionLength(fn, length, loose = false) {
  if (typeof fn !== 'function') {
    throw new TypeError('`fn` is not a function')
  }
  if (
    typeof length !== 'number' ||
    length < 0 ||
    length > 0xff_ff_ff_ff ||
    Math.floor(length) !== length
  ) {
    throw new TypeError('`length` must be a positive 32-bit integer')
  }
  const desc = gOPD(fn, 'length')
  const configurable = desc ? !!desc.configurable : true
  const writable = desc ? !!desc.writable : true
  if (configurable || writable || !loose) {
    ObjectDefineProperty(fn, 'length', {
      configurable,
      enumerable: false,
      value: length,
      writable: false
    })
  }
  return fn
}
