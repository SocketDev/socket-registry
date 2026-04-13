/**
 * @fileoverview Tests for array.of NPM package override.
 * Ported 1:1 from upstream v1.0.4 (8808af3c5f68a23dd769a063208e5a410bfffbe0):
 * https://github.com/es-shims/Array.of/blob/8808af3c5f68a23dd769a063208e5a410bfffbe0/test/tests.js
 */

import { describe, expect, it } from 'vitest'

import { setupNpmPackageTest } from '../utils/npm-package-helper.mts'

const {
  eco,
  module: of,
  skip,
  sockRegPkgName,
} = await setupNpmPackageTest(import.meta.url)

describe(`${eco} > ${sockRegPkgName}`, { skip }, () => {
  describe('nullish receiver', () => {
    it('works with undefined receiver', () => {
      expect(of.call(undefined, 1)).toEqual([1])
    })

    it('works with null receiver', () => {
      expect(of.call(null, 2)).toEqual([2])
    })
  })

  it('wraps single values in array', () => {
    expect(of('abc')).toEqual(['abc'])
    expect(of(undefined)).toEqual([undefined])
    expect(of(null)).toEqual([null])
    expect(of(false)).toEqual([false])
    expect(of(-Infinity)).toEqual([-Infinity])
    expect(of(-0)).toEqual([-0])
    expect(of(+0)).toEqual([+0])
    expect(of(1)).toEqual([1])
    expect(of(Infinity)).toEqual([Infinity])
  })

  it('works with multiple arguments', () => {
    expect(of(1, 2, 3)).toEqual([1, 2, 3])
  })

  it('wraps array-like objects as single element', () => {
    expect(of({ 0: 'a', 1: 'b', 2: 'c', length: 3 })).toEqual([
      { 0: 'a', 1: 'b', 2: 'c', length: 3 },
    ])
  })

  it('works with mixed types', () => {
    expect(
      of(undefined, null, false, -Infinity, -0, 0, 1, 2, Infinity),
    ).toEqual([undefined, null, false, -Infinity, -0, 0, 1, 2, Infinity])
  })

  describe('with null this', () => {
    it('wraps single values', () => {
      expect(of.call(null, 'abc')).toEqual(['abc'])
      expect(of.call(null, undefined)).toEqual([undefined])
      expect(of.call(null, null)).toEqual([null])
      expect(of.call(null, false)).toEqual([false])
      expect(of.call(null, -Infinity)).toEqual([-Infinity])
      expect(of.call(null, -0)).toEqual([-0])
      expect(of.call(null, +0)).toEqual([+0])
      expect(of.call(null, 1)).toEqual([1])
      expect(of.call(null, Infinity)).toEqual([Infinity])
    })

    it('wraps multiple values', () => {
      expect(of.call(null, 1, 2, 3)).toEqual([1, 2, 3])
    })

    it('wraps array-like objects', () => {
      expect(of.call(null, { 0: 'a', 1: 'b', 2: 'c', length: 3 })).toEqual([
        { 0: 'a', 1: 'b', 2: 'c', length: 3 },
      ])
    })

    it('wraps mixed types', () => {
      expect(
        of.call(null, undefined, null, false, -Infinity, -0, 0, 1, 2, Infinity),
      ).toEqual([undefined, null, false, -Infinity, -0, 0, 1, 2, Infinity])
    })

    it('returns zero length when called with no args', () => {
      expect(of.call(Object).length).toBe(0)
    })
  })

  describe('with apply', () => {
    it('wraps single values', () => {
      expect(of.apply(null, ['abc'])).toEqual(['abc'])
      expect(of.apply(null, [undefined])).toEqual([undefined])
      expect(of.apply(null, [null])).toEqual([null])
      expect(of.apply(null, [false])).toEqual([false])
      expect(of.apply(null, [-Infinity])).toEqual([-Infinity])
      expect(of.apply(null, [-0])).toEqual([-0])
      expect(of.apply(null, [0])).toEqual([0])
      expect(of.apply(null, [1])).toEqual([1])
      expect(of.apply(null, [Infinity])).toEqual([Infinity])
    })

    it('wraps multiple values', () => {
      expect(of.apply(null, [1, 2, 3])).toEqual([1, 2, 3])
    })

    it('wraps array-like objects', () => {
      expect(of.apply(null, [{ 0: 'a', 1: 'b', 2: 'c', length: 3 }])).toEqual([
        { 0: 'a', 1: 'b', 2: 'c', length: 3 },
      ])
    })

    it('wraps mixed types', () => {
      expect(
        of.apply(null, [
          undefined,
          null,
          false,
          -Infinity,
          -0,
          0,
          1,
          2,
          Infinity,
        ]),
      ).toEqual([undefined, null, false, -Infinity, -0, +0, 1, 2, Infinity])
    })

    it('returns zero length when called with no args', () => {
      expect(of.apply(Object).length).toBe(0)
    })
  })

  it('throws on frozen object constructor', () => {
    expect(() =>
      of.call(function () {
        return Object.freeze({})
      }),
    ).toThrow(TypeError)
    expect(() =>
      of.apply(function () {
        return Object.freeze({})
      }),
    ).toThrow(TypeError)
  })

  it('does not call setters for indexes', () => {
    const MyType = function (this: any) {} as any
    Object.defineProperty(MyType.prototype, '0', {
      set(_x: any) {
        throw new SyntaxError('Setter called: ' + _x)
      },
    })

    const expected = new MyType()
    Object.defineProperty(expected, '0', {
      value: 'abc',
      writable: true,
      enumerable: true,
      configurable: true,
    })
    Object.defineProperty(expected, 'length', {
      value: 1,
      writable: true,
      enumerable: true,
      configurable: true,
    })
    expect(of.call(MyType, 'abc')).toEqual(expected)
  })
})
