'use strict'

// Use non-'node:' prefixed require to avoid Webpack errors.

const builtinBufferExports = require('node:buffer')

const { Buffer: UnsafeBuffer } = builtinBufferExports

// Safe by construction: numeric first arguments are rejected by Buffer.from
// rather than allocating uninitialized memory the way upstream's deprecated
// Buffer() delegation could.
const SafeBuffer = Object.defineProperties(function SafeBuffer(
  arg,
  encodingOrOffset,
  length,
) {
  return UnsafeBuffer.from(arg, encodingOrOffset, length)
}, Object.getOwnPropertyDescriptors(UnsafeBuffer))

// Upstream majors 1-4 export the callable SafeBuffer itself, and 5.x
// re-exports the whole node:buffer namespace once the natives are safe, so
// consumers read kMaxLength, transcode, constants, Blob, and friends off the
// module. Serve the union: the callable carries the namespace, minus the
// unsafe SlowBuffer.
Object.defineProperties(
  SafeBuffer,
  Object.fromEntries(
    Object.entries(
      Object.getOwnPropertyDescriptors(builtinBufferExports),
    ).filter(({ 0: key }) => key !== 'Buffer' && key !== 'SlowBuffer'),
  ),
)

SafeBuffer.Buffer = SafeBuffer

module.exports = SafeBuffer
