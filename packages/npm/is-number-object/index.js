'use strict'

const { valueOf: numValueOf } = Number.prototype

module.exports = function isNumber(value) {
  if (typeof value === 'number') {
    return true
  }
  if (value !== null && typeof value === 'object') {
    try {
      numValueOf.call(value)
      return true
    } catch {}
  }
  return false
}
