/**
 * @fileoverview Tests for typed-array-length NPM package override.
 * Ported 1:1 from upstream v1.0.7 (25731a8c):
 * https://github.com/inspect-js/typed-array-length/blob/25731a8c/test/index.js
 */
import { describe, expect, it } from 'vitest'

import { setupNpmPackageTest } from '../util/npm-package-helper.mts'

const {
  eco,
  module: typedArrayLength,
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
      expect(typedArrayLength()).toBe(false)
      expect(typedArrayLength(undefined)).toBe(false)
      expect(typedArrayLength(false)).toBe(false)
      expect(typedArrayLength(true)).toBe(false)
    })

    it('returns false for objects', () => {
      expect(typedArrayLength({})).toBe(false)
      expect(typedArrayLength(/a/g)).toBe(false)
      expect(typedArrayLength(new RegExp('a', 'g'))).toBe(false)
      expect(typedArrayLength(new Date())).toBe(false)
    })

    it('returns false for numbers', () => {
      expect(typedArrayLength(42)).toBe(false)
      expect(typedArrayLength(Object(42))).toBe(false)
      expect(typedArrayLength(NaN)).toBe(false)
      expect(typedArrayLength(Infinity)).toBe(false)
    })

    it('returns false for strings', () => {
      expect(typedArrayLength('foo')).toBe(false)
      expect(typedArrayLength(Object('foo'))).toBe(false)
    })

    it('returns false for functions', () => {
      expect(typedArrayLength(function () {})).toBe(false)
    })
  })

  describe('Typed Arrays', () => {
    it('returns correct length', () => {
      for (let i = 0, { length } = typedArrayNames; i < length; i += 1) {
        const name = typedArrayNames[i]!
        const TA = globalThis[name]
        if (typeof TA === 'function') {
          const length = 10
          const arr = new TA(length)
          expect(typedArrayLength(arr)).toBe(length)
        }
      }
    })
  })
})
