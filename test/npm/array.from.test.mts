/**
 * @fileoverview Tests for array.from NPM package override.
 * Ported 1:1 from upstream v1.1.5 (10637c09c1e8dff7386a357bdf755eca85ae9a3d):
 * https://github.com/es-shims/Array.from/blob/10637c09c1e8dff7386a357bdf755eca85ae9a3d/test/index.js
 */

import { describe, expect, it } from 'vitest'

import { setupNpmPackageTest } from '../utils/npm-package-helper.mts'

const {
  eco,
  module: arrayFrom,
  skip,
  sockRegPkgName,
} = await setupNpmPackageTest(import.meta.url)

const hasSymbols =
  typeof Symbol === 'function' && typeof Symbol('foo') === 'symbol'

describe(`${eco} > ${sockRegPkgName}`, { skip }, () => {
  it('from has proper length', () => {
    expect(arrayFrom.length).toBe(1)
  })

  it('requires an array-like object', () => {
    expect(() => arrayFrom()).toThrow(TypeError)
    expect(() => arrayFrom(undefined)).toThrow(TypeError)
  })

  it('throws with invalid lengths', () => {
    expect(() => arrayFrom({ length: Infinity })).toThrow(RangeError)
    expect(() => arrayFrom({ length: Math.pow(2, 32) })).toThrow(RangeError)
  })

  it('swallows negative lengths', () => {
    expect(arrayFrom({ length: -1 }).length).toBe(0)
    expect(arrayFrom({ length: -Infinity }).length).toBe(0)
    expect(arrayFrom({ length: -0 }).length).toBe(0)
    expect(arrayFrom({ length: -42 }).length).toBe(0)
  })

  it('works with primitives', () => {
    expect(arrayFrom(false)).toEqual([])
    expect(arrayFrom(true)).toEqual([])
    expect(arrayFrom(-Infinity)).toEqual([])
    expect(arrayFrom(-0)).toEqual([])
    expect(arrayFrom(0)).toEqual([])
    expect(arrayFrom(1)).toEqual([])
    expect(arrayFrom(Infinity)).toEqual([])
  })

  it('works with primitive strings', () => {
    expect(arrayFrom('')).toEqual([])
    expect(arrayFrom('abc')).toEqual('abc'.split(''))
    expect(arrayFrom('a\nb\nc\n\n')).toEqual('a\nb\nc\n\n'.split(''))
    expect(arrayFrom('foo\uD834\uDF06bar')).toEqual([
      'f',
      'o',
      'o',
      '\uD834\uDF06',
      'b',
      'a',
      'r',
    ])
    expect(arrayFrom('foo\uD834bar')).toEqual([
      'f',
      'o',
      'o',
      '\uD834',
      'b',
      'a',
      'r',
    ])
    expect(arrayFrom('foo\uDF06bar')).toEqual([
      'f',
      'o',
      'o',
      '\uDF06',
      'b',
      'a',
      'r',
    ])
  })

  it('works with object strings', () => {
    expect(arrayFrom(Object(''))).toEqual([])
    expect(arrayFrom(Object('abc'))).toEqual('abc'.split(''))
    expect(arrayFrom(Object('a\nb\nc\n\n'))).toEqual('a\nb\nc\n\n'.split(''))
    expect(arrayFrom(Object('foo\uD834\uDF06bar'))).toEqual([
      'f',
      'o',
      'o',
      '\uD834\uDF06',
      'b',
      'a',
      'r',
    ])
    expect(arrayFrom(Object('foo\uD834bar'))).toEqual([
      'f',
      'o',
      'o',
      '\uD834',
      'b',
      'a',
      'r',
    ])
    expect(arrayFrom(Object('foo\uDF06bar'))).toEqual([
      'f',
      'o',
      'o',
      '\uDF06',
      'b',
      'a',
      'r',
    ])
  })

  it('uses iterators with strings', { skip: !hasSymbols }, () => {
    const a: any = Object('a')
    const b = Object('b')
    a[Symbol.iterator] = function () {
      return b[Symbol.iterator]()
    }
    expect(arrayFrom(a)).toEqual(['b'])
  })

  it('works with objects', () => {
    expect(arrayFrom({})).toEqual([])
    expect(arrayFrom({ a: 1 })).toEqual([])
  })

  it('works with arrays', () => {
    expect(arrayFrom([])).toEqual([])
    expect(arrayFrom([1, 2, 3])).toEqual([1, 2, 3])
    expect(arrayFrom([4, 5, 6])).toEqual([4, 5, 6])
  })

  it('fills holes in arrays', () => {
    const arr = [1, 2, 3]
    delete (arr as any)[1]
    expect(arrayFrom(arr)).toEqual([1, undefined, 3])
    // eslint-disable-next-line no-sparse-arrays
    expect(arrayFrom([4, , 6])).toEqual([4, undefined, 6])
  })

  it('works with arraylike objects', () => {
    expect(arrayFrom({ length: 1 })).toEqual([undefined])
    expect(arrayFrom({ 0: 'a', 1: 'b', length: 2 })).toEqual(['a', 'b'])
  })

  it('throws with an invalid mapping function', () => {
    expect(() => arrayFrom([], undefined)).not.toThrow()
    expect(() => arrayFrom([], undefined, undefined)).not.toThrow()
    expect(() => arrayFrom([], undefined, {})).not.toThrow()
    // oxlint-disable-next-line socket/prefer-undefined-over-null -- Array.from spec rejects null mapfn (not callable, not undefined).
    expect(() => arrayFrom([], null)).toThrow(TypeError)
    expect(() => arrayFrom([], false)).toThrow(TypeError)
    expect(() => arrayFrom([], true)).toThrow(TypeError)
    expect(() => arrayFrom([], {})).toThrow(TypeError)
    expect(() => arrayFrom([], /a/g)).toThrow(TypeError)
    expect(() => arrayFrom([], 'foo')).toThrow(TypeError)
    expect(() => arrayFrom([], 42)).toThrow(TypeError)
  })

  describe('mapping function', () => {
    const original = [1, 2, 3]

    it('works with arrays', () => {
      const actual = arrayFrom(
        original,
        function (this: any, value: any, index: number) {
          expect(value).toBe(original[index])
          expect(arguments.length).toBe(2)
          return value * 2
        },
      )
      expect(actual).toEqual([2, 4, 6])
    })

    it('works with strings', () => {
      const actual = arrayFrom('abc', (c: string) => c.toUpperCase())
      expect(actual).toEqual(['A', 'B', 'C'])
    })

    it('accepts an object thisArg', () => {
      const context = {}
      arrayFrom(
        original,
        function (this: any) {
          expect(this).toBe(context)
        },
        context,
      )
    })

    it('accepts a primitive thisArg', () => {
      arrayFrom(
        original,
        function (this: any) {
          expect(this.valueOf()).toBe(42)
          expect(Object.prototype.toString.call(this)).toBe('[object Number]')
        },
        42,
      )
    })

    it('accepts a falsy thisArg', () => {
      arrayFrom(
        original,
        function (this: any) {
          expect(this.valueOf()).toBe(false)
          expect(Object.prototype.toString.call(this)).toBe('[object Boolean]')
        },
        false,
      )
    })
  })

  it('works when called from a non-constructor context', () => {
    const from = arrayFrom
    expect(from.call(undefined, { 0: 'a', length: 1 })).toEqual(['a'])
    expect(arrayFrom({ 0: 'a', length: 1 })).toEqual(['a'])
  })

  it('allows shift without throwing type error', () => {
    expect(() =>
      Array.prototype.shift.bind(arrayFrom([1, 2, 3]))(),
    ).not.toThrow()
  })

  describe('works with iterable objects', () => {
    it('works with arguments', () => {
      ;(function (..._args: any[]) {
        expect(arrayFrom(arguments)).toEqual([1, 2, 3])
      })(1, 2, 3)
    })

    it('works with Map objects', () => {
      const map = new Map()
      map.set(1, 2)
      map.set(3, 4)
      expect(arrayFrom(map)).toEqual([
        [1, 2],
        [3, 4],
      ])
    })

    it('works with Map iterators', () => {
      const map = new Map()
      map.set(1, 2)
      map.set(3, 4)
      expect(arrayFrom(map.values())).toEqual([2, 4])
      expect(arrayFrom(map.keys())).toEqual([1, 3])
      expect(arrayFrom(map.entries())).toEqual([
        [1, 2],
        [3, 4],
      ])
    })

    it('works with Set objects', () => {
      const set = new Set()
      set.add(1)
      set.add(2)
      set.add(3)
      expect(arrayFrom(set)).toEqual([1, 2, 3])
    })

    it('works with Set iterators', () => {
      const set = new Set()
      set.add(1)
      set.add(2)
      set.add(3)
      expect(arrayFrom(set.values())).toEqual([1, 2, 3])
      expect(arrayFrom(set.keys())).toEqual([1, 2, 3])
      expect(arrayFrom(set.entries())).toEqual([
        [1, 1],
        [2, 2],
        [3, 3],
      ])
    })
  })

  it('returns the correct name when called with toString', () => {
    expect(arrayFrom.name).toBe('from')
  })

  it('test262: elements-deleted-after', () => {
    const originalArray = [0, 1, -2, 4, -8, 16]
    const array = [0, 1, -2, 4, -8, 16]
    const o = { arrayIndex: -1 }

    const mapper = function (this: typeof o, _value: any, index: number) {
      this.arrayIndex += 1
      expect(index).toBe(this.arrayIndex)
      array.splice(array.length - 1, 1)
      return 127
    }

    const a = arrayFrom(array, mapper, o)

    expect(a.length).toBe(originalArray.length / 2)

    for (let j = 0; j < originalArray.length / 2; j++) {
      expect(a[j]).toBe(127)
    }
  })
})
