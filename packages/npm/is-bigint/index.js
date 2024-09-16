'use strict'

const { valueOf: bigIntValueOf } = BigInt.prototype

module.exports = function isBigInt(value) {
  if (typeof value === 'bigint') {
    return true
  }
  if (value !== null && typeof value === 'object') {
    try {
      bigIntValueOf.call(value)
      return true
    } catch {}
  }
  return false
}
