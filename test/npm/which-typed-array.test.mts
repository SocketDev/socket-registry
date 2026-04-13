/**
 * @fileoverview Tests for which-typed-array NPM package override.
 * Ported 1:1 from upstream v1.1.20 (2710ad21):
 * https://github.com/inspect-js/which-typed-array/blob/2710ad21/test/index.js
 */
import { describe, expect, it } from 'vitest'

import { setupNpmPackageTest } from '../utils/npm-package-helper.mts'

const {
  eco,
  module: whichTypedArray,
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
      expect(whichTypedArray()).toBe(false)
      expect(whichTypedArray(null)).toBe(false)
      expect(whichTypedArray(false)).toBe(false)
      expect(whichTypedArray(true)).toBe(false)
    })

    it('returns false for objects', () => {
      expect(whichTypedArray({})).toBe(false)
      expect(whichTypedArray(/a/g)).toBe(false)
      expect(whichTypedArray(new RegExp('a', 'g'))).toBe(false)
      expect(whichTypedArray(new Date())).toBe(false)
    })

    it('returns false for numbers', () => {
      expect(whichTypedArray(42)).toBe(false)
      expect(whichTypedArray(Object(42))).toBe(false)
      expect(whichTypedArray(NaN)).toBe(false)
      expect(whichTypedArray(Infinity)).toBe(false)
    })

    it('returns false for strings', () => {
      expect(whichTypedArray('foo')).toBe(false)
      expect(whichTypedArray(Object('foo'))).toBe(false)
    })

    it('returns false for functions', () => {
      expect(whichTypedArray(function () {})).toBe(false)
    })
  })

  describe('@@toStringTag fakes', () => {
    it('returns false for faked typed arrays', () => {
      for (const name of typedArrayNames) {
        if (typeof globalThis[name] === 'function') {
          const fakeTypedArray: any = []
          fakeTypedArray[Symbol.toStringTag] = name
          expect(whichTypedArray(fakeTypedArray)).toBe(false)
        }
      }
    })
  })

  describe('Typed Arrays', () => {
    it('returns the correct type name', () => {
      for (const name of typedArrayNames) {
        const TA = globalThis[name]
        if (typeof TA === 'function') {
          const arr = new TA(10)
          expect(whichTypedArray(arr)).toBe(name)
        }
      }
    })
  })
})
