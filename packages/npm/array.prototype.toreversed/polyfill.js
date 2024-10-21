'use strict'

const impl = require('./implementation')

module.exports = function getPolyfill() {
  const { toReversed: ArrayProtoToReversed } = Array.prototype
  return typeof ArrayProtoToReversed === 'function'
    ? ArrayProtoToReversed
    : impl
}
