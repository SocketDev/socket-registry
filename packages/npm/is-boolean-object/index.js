'use strict'

const { valueOf: boolValueOf } = Boolean.prototype

module.exports = function isBoolean(value) {
  if (typeof value === 'boolean') {
    return true
  }
  if (value !== null && typeof value === 'object') {
    try {
      boolValueOf.call(value)
      return true
    } catch {}
  }
  return false
}
