/**
 * @file Type-specific deep-equal comparison tests for the deep-equal package
 *   override — arrays, primitives, prototypes, regexen, errors, boxed
 *   primitives, circular references, TypedArrays, and ArrayBuffers. The
 *   collection/primitive equality cases live in deep-equal.test.mts; both bind
 *   to the `deep-equal` override. Ported from
 *   https://github.com/inspect-js/node-deep-equal/blob/48d3bb5b7fe3e65fd564b737c69a9411eb40bc65/test/cmp.js.
 */

import { describe, expect, it } from 'vitest'

import { setupNpmPackageTest } from '../util/npm-package-helper.mts'

const {
  eco,
  module: deepEqual,
  skip,
  sockRegPkgName,
} = setupNpmPackageTest(import.meta.url, { package: 'deep-equal' })

// deep-equal package tests may have issues with test dependencies.
describe(`${eco} > ${sockRegPkgName} > types`, { skip }, () => {
  describe('Arrays', () => {
    it('equal arrays', () => {
      expect(deepEqual([1, 2, 3], [1, 2, 3])).toBe(true)
      expect(deepEqual([1, 2, 3], [1, 2, 3], { strict: true })).toBe(true)
    })

    it('inequal arrays', () => {
      expect(deepEqual([1, 2, 3], [1, 2, 4])).toBe(false)
      expect(deepEqual([1, 2, 3], [1, 2, 4], { strict: true })).toBe(false)
    })

    it('arrays with different lengths', () => {
      expect(deepEqual([1, 2, 3], [1, 2])).toBe(false)
      expect(deepEqual([1, 2, 3], [1, 2], { strict: true })).toBe(false)
    })

    it('nested arrays', () => {
      expect(
        deepEqual(
          [
            [1, 2],
            [3, 4],
          ],
          [
            [1, 2],
            [3, 4],
          ],
        ),
      ).toBe(true)
      expect(
        deepEqual(
          [
            [1, 2],
            [3, 4],
          ],
          [
            [1, 2],
            [3, 4],
          ],
          { strict: true },
        ),
      ).toBe(true)
    })

    it('sparse arrays', () => {
      const arr1 = [1, undefined, 3]
      const arr2 = [1, undefined, 3]
      expect(deepEqual(arr1, arr2)).toBe(true)
      expect(deepEqual(arr1, arr2, { strict: true })).toBe(true)
    })
  })

  describe('booleans', () => {
    it('equal booleans', () => {
      expect(deepEqual(true, true)).toBe(true)
      expect(deepEqual(true, true, { strict: true })).toBe(true)
      expect(deepEqual(false, false)).toBe(true)
      expect(deepEqual(false, false, { strict: true })).toBe(true)
    })

    it('inequal booleans', () => {
      expect(deepEqual(true, false)).toBe(false)
      expect(deepEqual(true, false, { strict: true })).toBe(false)
    })

    it('boolean and number', () => {
      expect(deepEqual(true, 1)).toBe(true)
      expect(deepEqual(true, 1, { strict: true })).toBe(false)
      expect(deepEqual(false, 0)).toBe(true)
      expect(deepEqual(false, 0, { strict: true })).toBe(false)
    })
  })

  describe('null == undefined', () => {
    it('null and undefined', () => {
      expect(deepEqual(null, undefined)).toBe(true)
      expect(deepEqual(null, undefined, { strict: true })).toBe(false)
    })

    it('null and null', () => {
      expect(deepEqual(null, null)).toBe(true)
      expect(deepEqual(null, null, { strict: true })).toBe(true)
    })

    it('undefined and undefined', () => {
      expect(deepEqual(undefined, undefined)).toBe(true)
      expect(deepEqual(undefined, undefined, { strict: true })).toBe(true)
    })
  })

  describe('NaNs', () => {
    it('NaN and NaN', () => {
      // Loose uses `==` (NaN != NaN); strict uses Object.is (NaN is NaN).
      expect(deepEqual(Number.NaN, Number.NaN)).toBe(false)
      expect(deepEqual(Number.NaN, Number.NaN, { strict: true })).toBe(true)
    })

    it('NaN and number', () => {
      expect(deepEqual(Number.NaN, 0)).toBe(false)
      expect(deepEqual(Number.NaN, 0, { strict: true })).toBe(false)
    })
  })

  describe('zeroes', () => {
    it('+0 and -0', () => {
      expect(deepEqual(+0, -0)).toBe(true)
      expect(deepEqual(+0, -0, { strict: true })).toBe(false)
    })

    it('0 and 0', () => {
      expect(deepEqual(0, 0)).toBe(true)
      expect(deepEqual(0, 0, { strict: true })).toBe(true)
    })
  })

  describe('Object.create', () => {
    it('objects with same prototype', () => {
      const proto = { a: 1 }
      const obj1 = Object.create(proto)
      const obj2 = Object.create(proto)
      obj1.b = 2
      obj2.b = 2
      expect(deepEqual(obj1, obj2)).toBe(true)
      expect(deepEqual(obj1, obj2, { strict: true })).toBe(true)
    })

    it('objects with different prototypes', () => {
      const proto1 = { a: 1 }
      const proto2 = { a: 2 }
      const obj1 = Object.create(proto1)
      const obj2 = Object.create(proto2)
      // Loose compares own enumerable keys only (both have none → equal);
      // strict also compares prototypes (proto1 !== proto2 → unequal).
      expect(deepEqual(obj1, obj2)).toBe(true)
      expect(deepEqual(obj1, obj2, { strict: true })).toBe(false)
    })

    it('Object.create(null)', () => {
      const obj1 = Object.create(null)
      const obj2 = Object.create(null)
      obj1.a = 1
      obj2.a = 1
      expect(deepEqual(obj1, obj2)).toBe(true)
      expect(deepEqual(obj1, obj2, { strict: true })).toBe(true)
    })
  })

  describe('regexen', () => {
    it('equal regexes', () => {
      expect(deepEqual(/abc/, /abc/)).toBe(true)
      expect(deepEqual(/abc/, /abc/, { strict: true })).toBe(true)
      expect(deepEqual(/abc/i, /abc/i)).toBe(true)
      expect(deepEqual(/abc/i, /abc/i, { strict: true })).toBe(true)
    })

    it('inequal regexes', () => {
      expect(deepEqual(/abc/, /abd/)).toBe(false)
      expect(deepEqual(/abc/, /abd/, { strict: true })).toBe(false)
      expect(deepEqual(/abc/, /abc/i)).toBe(false)
      expect(deepEqual(/abc/, /abc/i, { strict: true })).toBe(false)
    })

    it('regex and string', () => {
      expect(deepEqual(/abc/, 'abc')).toBe(false)
      expect(deepEqual(/abc/, 'abc', { strict: true })).toBe(false)
    })
  })

  describe('Errors', () => {
    it('equal errors', () => {
      const err1 = new Error('test')
      const err2 = new Error('test')
      expect(deepEqual(err1, err2)).toBe(true)
      expect(deepEqual(err1, err2, { strict: true })).toBe(true)
    })

    it('inequal errors', () => {
      const err1 = new Error('test1')
      const err2 = new Error('test2')
      expect(deepEqual(err1, err2)).toBe(false)
      expect(deepEqual(err1, err2, { strict: true })).toBe(false)
    })

    it('different error types', () => {
      const err1 = new Error('test')
      const err2 = new TypeError('test')
      expect(deepEqual(err1, err2)).toBe(false)
      expect(deepEqual(err1, err2, { strict: true })).toBe(false)
    })
  })

  describe('boxed primitives', () => {
    it('equal boxed strings', () => {
      expect(deepEqual(new String('test'), new String('test'))).toBe(true)
      expect(
        deepEqual(new String('test'), new String('test'), { strict: true }),
      ).toBe(true)
    })

    it('boxed string and primitive string', () => {
      expect(deepEqual(new String('test'), 'test')).toBe(false)
      expect(deepEqual(new String('test'), 'test', { strict: true })).toBe(
        false,
      )
    })

    it('equal boxed numbers', () => {
      expect(deepEqual(new Number(42), new Number(42))).toBe(true)
      expect(deepEqual(new Number(42), new Number(42), { strict: true })).toBe(
        true,
      )
    })

    it('boxed number and primitive number', () => {
      expect(deepEqual(new Number(42), 42)).toBe(false)
      expect(deepEqual(new Number(42), 42, { strict: true })).toBe(false)
    })

    it('equal boxed booleans', () => {
      expect(deepEqual(new Boolean(true), new Boolean(true))).toBe(true)
      expect(
        deepEqual(new Boolean(true), new Boolean(true), { strict: true }),
      ).toBe(true)
    })

    it('boxed boolean and primitive boolean', () => {
      expect(deepEqual(new Boolean(true), true)).toBe(false)
      expect(deepEqual(new Boolean(true), true, { strict: true })).toBe(false)
    })
  })

  describe('circular references', () => {
    it('objects with circular references', () => {
      const obj1: Record<string, unknown> = { a: 1 }
      obj1['self'] = obj1
      const obj2: Record<string, unknown> = { a: 1 }
      obj2['self'] = obj2
      expect(deepEqual(obj1, obj2)).toBe(true)
      expect(deepEqual(obj1, obj2, { strict: true })).toBe(true)
    })

    it('arrays with circular references', () => {
      const arr1: unknown[] = [1, 2]
      arr1.push(arr1)
      const arr2: unknown[] = [1, 2]
      arr2.push(arr2)
      expect(deepEqual(arr1, arr2)).toBe(true)
      expect(deepEqual(arr1, arr2, { strict: true })).toBe(true)
    })
  })

  describe('TypedArrays', () => {
    it('equal Uint8Arrays', () => {
      const arr1 = new Uint8Array([1, 2, 3])
      const arr2 = new Uint8Array([1, 2, 3])
      expect(deepEqual(arr1, arr2)).toBe(true)
      expect(deepEqual(arr1, arr2, { strict: true })).toBe(true)
    })

    it('inequal Uint8Arrays', () => {
      const arr1 = new Uint8Array([1, 2, 3])
      const arr2 = new Uint8Array([1, 2, 4])
      expect(deepEqual(arr1, arr2)).toBe(false)
      expect(deepEqual(arr1, arr2, { strict: true })).toBe(false)
    })

    it('different TypedArray types with same values', () => {
      const arr1 = new Uint8Array([1, 2, 3])
      const arr2 = new Int8Array([1, 2, 3])
      expect(deepEqual(arr1, arr2)).toBe(false)
      expect(deepEqual(arr1, arr2, { strict: true })).toBe(false)
    })
  })

  describe('ArrayBuffers', () => {
    it('equal ArrayBuffers', () => {
      if (typeof ArrayBuffer !== 'function') {
        return
      }

      const buf1 = new ArrayBuffer(8)
      const buf2 = new ArrayBuffer(8)
      expect(deepEqual(buf1, buf2)).toBe(true)
      expect(deepEqual(buf1, buf2, { strict: true })).toBe(true)
    })

    it('inequal ArrayBuffers', () => {
      if (typeof ArrayBuffer !== 'function') {
        return
      }

      const buf1 = new ArrayBuffer(8)
      const buf2 = new ArrayBuffer(8)
      const view1 = new Int8Array(buf1)
      view1[0] = 1
      expect(deepEqual(buf1, buf2)).toBe(false)
      expect(deepEqual(buf1, buf2, { strict: true })).toBe(false)
    })

    it('ArrayBuffers with different lengths', () => {
      if (typeof ArrayBuffer !== 'function') {
        return
      }

      const buf1 = new ArrayBuffer(8)
      const buf2 = new ArrayBuffer(16)
      expect(deepEqual(buf1, buf2)).toBe(false)
      expect(deepEqual(buf1, buf2, { strict: true })).toBe(false)
    })
  })
})
