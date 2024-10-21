'use strict'

const impl = require('./implementation')

module.exports = function getPolyfill() {
  const { toSorted: ArrayProtoToSorted } = Array.prototype
  return typeof ArrayProtoToSorted === 'function' ? ArrayProtoToSorted : impl
}
