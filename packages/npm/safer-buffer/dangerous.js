'use strict'

const {
  Buffer: { allocUnsafe, allocUnsafeSlow },
  // Use non-'node:' prefixed require to avoid Webpack errors.
  // eslint-disable-next-line n/prefer-node-protocol
} = require('buffer')

const safer = require('./safer')
const { builtinBufferExportsDescMap } = require('./shared')

const {
  Blob: BlobCtor,
  Buffer: Safer,
  File: FileCtor,
  INSPECT_MAX_BYTES,
  atob: atobFn,
  btoa: btoaFn,
  constants,
  isAscii,
  isUtf8,
  kMaxLength,
  kStringMaxLength,
  resolveObjectURL,
  transcode,
} = safer

const Dangerous = Object.defineProperties(
  {
    allocUnsafe,
    allocUnsafeSlow,
  },
  Object.getOwnPropertyDescriptors(Safer),
)

module.exports = {
  INSPECT_MAX_BYTES,
  Blob: BlobCtor,
  File: FileCtor,
  atob: atobFn,
  btoa: btoaFn,
  constants,
  isAscii,
  isUtf8,
  kMaxLength,
  kStringMaxLength,
  resolveObjectURL,
  transcode,
  Buffer: Dangerous,
}
Object.defineProperties(module.exports, builtinBufferExportsDescMap)
