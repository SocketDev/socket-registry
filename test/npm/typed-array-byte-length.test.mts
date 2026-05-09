/**
 * @fileoverview Tests for typed-array-byte-length NPM package override.
 * Ported 1:1 from upstream v1.0.3 (1ff4b117):
 * https://github.com/inspect-js/typed-array-byte-length/blob/1ff4b117/test/index.js
 */
import { describe, expect, it } from 'vitest'

import { setupNpmPackageTest } from '../utils/npm-package-helper.mts'

const {
  eco,
  module: typedArrayByteLength,
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
      expect(typedArrayByteLength()).toBe(false)
      expect(typedArrayByteLength(undefined)).toBe(false)
      expect(typedArrayByteLength(false)).toBe(false)
      expect(typedArrayByteLength(true)).toBe(false)
    })

    it('returns false for objects', () => {
      expect(typedArrayByteLength({})).toBe(false)
      expect(typedArrayByteLength(/a/g)).toBe(false)
      expect(typedArrayByteLength(new RegExp('a', 'g'))).toBe(false)
      expect(typedArrayByteLength(new Date())).toBe(false)
    })

    it('returns false for numbers', () => {
      expect(typedArrayByteLength(42)).toBe(false)
      expect(typedArrayByteLength(Object(42))).toBe(false)
      expect(typedArrayByteLength(NaN)).toBe(false)
      expect(typedArrayByteLength(Infinity)).toBe(false)
    })

    it('returns false for strings', () => {
      expect(typedArrayByteLength('foo')).toBe(false)
      expect(typedArrayByteLength(Object('foo'))).toBe(false)
    })

    it('returns false for functions', () => {
      expect(typedArrayByteLength(function () {})).toBe(false)
    })
  })

  describe('Typed Arrays', () => {
    it('returns correct byte length', () => {
      const length = 64
      const byteOffset = 32

      for (const name of typedArrayNames) {
        const TA = globalThis[name]
        if (typeof TA === 'function') {
          const buffer = new ArrayBuffer(length)
          const arr = new TA(buffer, byteOffset)
          expect(typedArrayByteLength(arr)).toBe(byteOffset)
        }
      }
    })

    it('works with specific offset', () => {
      const buffer = new ArrayBuffer(8)
      const uint8 = new Uint8Array(buffer, 2)
      expect(typedArrayByteLength(uint8)).toBe(6)
    })
  })
})
