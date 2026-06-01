'use strict'

const { valueOf: bigIntValueOf } = BigInt.prototype
const { valueOf: boolValueOf } = Boolean.prototype
const { valueOf: numValueOf } = Number.prototype
const { valueOf: strValueOf } = String.prototype
const { valueOf: symValueOf } = Symbol.prototype

module.exports = function whichBoxedPrimitive(value) {
  if (
    value === null ||
    (typeof value !== 'object' && typeof value !== 'function')
  ) {
    return null
  }
  if (typeof value !== 'function') {
    try {
      strValueOf.call(value)
      return 'String'
    } catch {}
    try {
      numValueOf.call(value)
      return 'Number'
    } catch {}
    try {
      boolValueOf.call(value)
      return 'Boolean'
    } catch {}
    try {
      symValueOf.call(value)
      return 'Symbol'
    } catch {}
    try {
      bigIntValueOf.call(value)
      return 'BigInt'
    } catch {}
  }
  return undefined
}
