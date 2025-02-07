'use strict'

// Use non-'node:' prefixed require to avoid Webpack errors.
// eslint-disable-next-line n/prefer-node-protocol
const { Buffer: UnsafeBuffer } = require('buffer')

const SafeBuffer = Object.defineProperties(function SafeBuffer(
  arg,
  encodingOrOffset,
  length
) {
  return UnsafeBuffer.from(arg, encodingOrOffset, length)
}, Object.getOwnPropertyDescriptors(UnsafeBuffer))

module.exports = {
  Buffer: SafeBuffer
}
