'use strict'

const {
  INSPECT_MAX_BYTES,
  Blob: BlobCtor,
  Buffer: UnsafeBuffer,
  File: FileCtor,
  atob: atobFn,
  btoa: btoaFn,
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
  prototype: UnsafeBuffer.prototype
}
for (const key of Reflect.ownKeys(UnsafeBuffer)) {
  if (
    key !== 'allocUnsafe' &&
    key !== 'allocUnsafeSlow' &&
    key !== 'prototype'
  ) {
    Safer[key] = UnsafeBuffer[key]
  }
}
// Give Node ESM/CJS interop a chance to detect names of exports.
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
  Buffer: Safer
}
// Redefine INSPECT_MAX_BYTES, Blob, File, and resolveObjectURL as their
// builtin getter/setters.
Object.defineProperties(module.exports, builtinBufferExportsDescMap)
