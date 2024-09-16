'use strict'

const {
  INSPECT_MAX_BYTES,
  Blob,
  Buffer,
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
} = require('node:buffer')

const { builtinBufferExportsDescMap } = require('./shared')

const Safer = {
  prototype: Buffer.prototype
}
for (const key of Reflect.ownKeys(Buffer)) {
  if (
    key !== 'allocUnsafe' &&
    key !== 'allocUnsafeSlow' &&
    key !== 'prototype'
  ) {
    Safer[key] = Buffer[key]
  }
}
// Give Node ESM/CJS interop a chance to detect names of exports.
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
  Buffer: Safer
}
// Redefine INSPECT_MAX_BYTES, Blob, File, and resolveObjectURL as their
// builtin getter/setters.
Object.defineProperties(module.exports, builtinBufferExportsDescMap)
