/**
 * @file Tests for is-data-view NPM package override. Ported 1:1 from upstream
 *   v1.0.2 (e8a4943b):
 *   https://github.com/inspect-js/is-data-view/blob/e8a4943b72a33a075c6f9fd31f4e9e8a53e15b02/test/index.js.
 */

import { describe, expect, it } from 'vitest'

import { setupNpmPackageTest } from '../util/npm-package-helper.mts'

const {
  eco,
  module: isDataView,
  skip,
  sockRegPkgName,
} = setupNpmPackageTest(import.meta.url)

const typedArrayCtors = [
  BigInt64Array,
  BigUint64Array,
  Float32Array,
  Float64Array,
  Int16Array,
  Int32Array,
  Int8Array,
  Uint16Array,
  Uint32Array,
  Uint8Array,
  Uint8ClampedArray,
]

describe(`${eco} > ${sockRegPkgName}`, { skip }, () => {
  describe('not DataViews', () => {
    it('returns false for primitives', () => {
      const primitives = [
        undefined,
        null,
        false,
        true,
        0,
        -0,
        42,
        Infinity,
        -Infinity,
        NaN,
        '',
        'foo',
        42n,
        Symbol('sym'),
      ]
      for (let i = 0, { length } = primitives; i < length; i += 1) {
        const nonDV = primitives[i]!
        expect(isDataView(nonDV)).toBe(false)
      }
    })

    it('returns false for objects, functions, generators, and arrow functions', () => {
      const values = [
        {},
        [],
        /a/g,
        new Date(),
        new Error('not a data view'),
        function plain() {},
        function* gen() {},
        () => {},
      ]
      for (let i = 0, { length } = values; i < length; i += 1) {
        const nonDV = values[i]!
        expect(isDataView(nonDV)).toBe(false)
      }
    })

    it('returns false for typed arrays', () => {
      for (let i = 0, { length } = typedArrayCtors; i < length; i += 1) {
        const TypedArrayCtor = typedArrayCtors[i]!
        const ta = new TypedArrayCtor(8)
        expect(isDataView(ta)).toBe(false)
      }
    })
  })

  describe('@@toStringTag', () => {
    it('does not trust Symbol.toStringTag fakes', () => {
      for (let i = 0, { length } = typedArrayCtors; i < length; i += 1) {
        const TypedArrayCtor = typedArrayCtors[i]!
        const fakeTypedArray: unknown[] & { [Symbol.toStringTag]?: string } = []
        fakeTypedArray[Symbol.toStringTag] = TypedArrayCtor.name
        expect(isDataView(fakeTypedArray)).toBe(false)
      }
    })
  })

  describe('Data Views', () => {
    it('returns true for a DataView', () => {
      const ab = new ArrayBuffer(1)
      const dv = new DataView(ab)
      expect(isDataView(dv)).toBe(true)
    })

    it('returns true for a DataView over a detached ArrayBuffer', () => {
      const ab = new ArrayBuffer(8)
      const dv = new DataView(ab)
      ab.transfer()
      expect(isDataView(dv)).toBe(true)
    })

    it('returns true for a DataView out of bounds on a resizable ArrayBuffer', () => {
      const rab = new ArrayBuffer(8, { maxByteLength: 16 })
      const dv = new DataView(rab, 4)
      rab.resize(2)
      expect(isDataView(dv)).toBe(true)
    })
  })
})
