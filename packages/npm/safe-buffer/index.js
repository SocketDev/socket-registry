'use strict'

const SafeBuffer = Object.defineProperties(function SafeBuffer(
  arg,
  encodingOrOffset,
  length
) {
  return Buffer.from(arg, encodingOrOffset, length)
}, Object.getOwnPropertyDescriptors(Buffer))

module.exports = {
  Buffer: SafeBuffer
}
