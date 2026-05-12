/**
 * @fileoverview Tests for is-typed-array NPM package override.
 * Ported 1:1 from upstream v1.1.15 (4f2611d5):
 * https://github.com/inspect-js/is-typed-array/blob/4f2611d57b40760c01748181c4685c37145c6521/test/index.js
 */

import { describe, expect, it } from 'vitest'

import { setupNpmPackageTest } from '../utils/npm-package-helper.mts'

const {
  eco,
  module: isTypedArray,
  skip,
  sockRegPkgName,
} = await setupNpmPackageTest(import.meta.url)

const hasToStringTag =
  typeof Symbol === 'function' && typeof Symbol.toStringTag === 'symbol'

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
]

describe(`${eco} > ${sockRegPkgName}`, { skip }, () => {
  describe('not arrays', () => {
    it('non-number/string primitives', () => {
      expect(isTypedArray(undefined)).toBe(false)
      expect(isTypedArray(undefined)).toBe(false)
      expect(isTypedArray(false)).toBe(false)
      expect(isTypedArray(true)).toBe(false)
    })

    it('object is not typed array', () => {
      expect(isTypedArray({})).toBe(false)
    })

    it('regex literal is not typed array', () => {
      expect(isTypedArray(/a/g)).toBe(false)
    })

    it('regex object is not typed array', () => {
      expect(isTypedArray(new RegExp('a', 'g'))).toBe(false)
    })

    it('new Date() is not typed array', () => {
      expect(isTypedArray(new Date())).toBe(false)
    })

    it('numbers are not typed arrays', () => {
      expect(isTypedArray(42)).toBe(false)
      expect(isTypedArray(Object(42))).toBe(false)
      expect(isTypedArray(NaN)).toBe(false)
      expect(isTypedArray(Infinity)).toBe(false)
    })

    it('strings are not typed arrays', () => {
      expect(isTypedArray('foo')).toBe(false)
      expect(isTypedArray(Object('foo'))).toBe(false)
    })
  })

  describe('Functions', () => {
    it('function is not typed array', () => {
      expect(isTypedArray(function () {})).toBe(false)
    })
  })

  describe('@@toStringTag', { skip: !hasToStringTag }, () => {
    it('faked typed arrays are not typed arrays', () => {
      for (let i = 0, { length } = typedArrayNames; i < length; i += 1) {
        const name = typedArrayNames[i]!
        if (typeof (globalThis as any)[name] === 'function') {
          const fakeTypedArray: any = []
          fakeTypedArray[Symbol.toStringTag] = name
          expect(isTypedArray(fakeTypedArray)).toBe(false)
        }
      }
    })
  })

  describe('non-Typed Arrays', () => {
    it('[] is not typed array', () => {
      expect(isTypedArray([])).toBe(false)
    })
  })

  describe('Typed Arrays', () => {
    for (let i = 0, { length } = typedArrayNames; i < length; i += 1) {
      const name = typedArrayNames[i]!
      const TypedArray = (globalThis as any)[name]
      if (typeof TypedArray === 'function') {
        it(`new ${name}(10) is typed array`, () => {
          const arr = new TypedArray(10)
          expect(isTypedArray(arr)).toBe(true)
        })
      }
    }
  })
})
