'use strict'

// Use non-'node:' prefixed require to avoid Webpack errors.

const { Buffer: UnsafeBuffer } = require('node:buffer')

const SafeBuffer = Object.defineProperties(function SafeBuffer(
  arg,
  encodingOrOffset,
  length,
) {
  return UnsafeBuffer.from(arg, encodingOrOffset, length)
}, Object.getOwnPropertyDescriptors(UnsafeBuffer))

module.exports = {
  Buffer: SafeBuffer,
}
