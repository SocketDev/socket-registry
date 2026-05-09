/**
 * @fileoverview Tests for typed-array-byte-offset NPM package override.
 * Ported 1:1 from upstream v1.0.4 (392d04c8):
 * https://github.com/inspect-js/typed-array-byte-offset/blob/392d04c8/test/index.js
 */
import { describe, expect, it } from 'vitest'

import { setupNpmPackageTest } from '../utils/npm-package-helper.mts'

const {
  eco,
  module: typedArrayByteOffset,
  skip,
  sockRegPkgName,
} = await setupNpmPackageTest(import.meta.url)

const typedArrayNames = [
  'Int8Array',
  'Uint8Array',
  'Uint8ClampedArray',
  'Int16Array',
  'Uint16Array',
  'Int32Array',
  'Uint32Array',
  'Float32Array',
  'Float64Array',
  'BigInt64Array',
  'BigUint64Array',
] as const

describe(`${eco} > ${sockRegPkgName}`, { skip }, () => {
  describe('not typed arrays', () => {
    it('returns false for non-typed-array primitives', () => {
      expect(typedArrayByteOffset()).toBe(false)
      expect(typedArrayByteOffset(undefined)).toBe(false)
      expect(typedArrayByteOffset(false)).toBe(false)
      expect(typedArrayByteOffset(true)).toBe(false)
    })

    it('returns false for objects', () => {
      expect(typedArrayByteOffset({})).toBe(false)
      expect(typedArrayByteOffset(/a/g)).toBe(false)
      expect(typedArrayByteOffset(new RegExp('a', 'g'))).toBe(false)
      expect(typedArrayByteOffset(new Date())).toBe(false)
    })

    it('returns false for numbers', () => {
      expect(typedArrayByteOffset(42)).toBe(false)
      expect(typedArrayByteOffset(Object(42))).toBe(false)
      expect(typedArrayByteOffset(NaN)).toBe(false)
      expect(typedArrayByteOffset(Infinity)).toBe(false)
    })

    it('returns false for strings', () => {
      expect(typedArrayByteOffset('foo')).toBe(false)
      expect(typedArrayByteOffset(Object('foo'))).toBe(false)
    })

    it('returns false for functions', () => {
      expect(typedArrayByteOffset(function () {})).toBe(false)
    })
  })

  describe('Typed Arrays', () => {
    it('returns correct byte offset', () => {
      const length = 32
      const byteOffset = 16

      for (const name of typedArrayNames) {
        const TA = globalThis[name]
        if (typeof TA === 'function') {
          const buffer = new ArrayBuffer(length)
          const arr = new TA(buffer, byteOffset)
          expect(typedArrayByteOffset(arr)).toBe(byteOffset)
        }
      }
    })
  })
})
