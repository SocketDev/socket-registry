'use strict'

const {
  Buffer: {
    allocUnsafe: builtinAllocUnsafe,
    allocUnsafeSlow: builtinAllocUnsafeSlow
  }
} = require('node:buffer')

const safer = require('./safer')
const { builtinBufferExportsDescMap } = require('./shared')

const {
  INSPECT_MAX_BYTES,
  Blob,
  Buffer: Safer,
  File,
  atob,
  btoa,
  constants,
  isAscii,
  isUtf8,
  kMaxLength,
  kStringMaxLength,
  resolveObjectURL,
  transcode
} = safer

const Dangerous = Object.defineProperties(
  {
    allocUnsafe: builtinAllocUnsafe,
    allocUnsafeSlow: builtinAllocUnsafeSlow
  },
  Object.getOwnPropertyDescriptors(Safer)
)

module.exports = {
  INSPECT_MAX_BYTES,
  Blob,
  File,
  atob,
  btoa,
  constants,
  isAscii,
  isUtf8,
  kMaxLength,
  kStringMaxLength,
  resolveObjectURL,
  transcode,
  Buffer: Dangerous
}
Object.defineProperties(module.exports, builtinBufferExportsDescMap)
