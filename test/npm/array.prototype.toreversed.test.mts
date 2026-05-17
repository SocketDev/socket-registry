/**
 * @fileoverview Tests for array.prototype.toreversed NPM package override.
 * Ported 1:1 from upstream v1.1.2 (dae18065b74fb98686ddfb5462294963c4310600):
 * https://github.com/es-shims/Array.prototype.toReversed/blob/dae18065b74fb98686ddfb5462294963c4310600/test/tests.js
 */

import { describe, expect, it } from 'vitest'

import { setupNpmPackageTest } from '../util/npm-package-helper.mts'

const {
  eco,
  module: toReversed,
  skip,
  sockRegPkgName,
} = await setupNpmPackageTest(import.meta.url)

describe(`${eco} > ${sockRegPkgName}`, { skip }, () => {
  it('reverses an array', () => {
    const three = [1, 2, 3]
    const result = toReversed(three)
    expect(result).toEqual([3, 2, 1])
    expect(three).not.toBe(result)
    expect(three).toEqual([1, 2, 3])

    three.reverse()
    expect(three).toEqual(result)
  })

  it('handles array-like with length as string', () => {
    expect(toReversed({ length: '2', 0: 1, 1: 2, 2: 3 })).toEqual([2, 1])
  })

  it('handles array-like with length valueOf', () => {
    const arrayLikeLengthValueOf = {
      length: {
        valueOf() {
          return 2
        },
      },
      0: 1,
      1: 2,
      2: 3,
    }
    expect(toReversed(arrayLikeLengthValueOf)).toEqual([2, 1])
  })

  describe('not positive integer lengths', () => {
    it('negative length yields empty array', () => {
      expect(toReversed({ length: -2 })).toEqual([])
    })

    it('string length yields empty array', () => {
      expect(toReversed({ length: 'dog' })).toEqual([])
    })

    it('NaN length yields empty array', () => {
      expect(toReversed({ length: NaN })).toEqual([])
    })
  })

  describe('too-large lengths', () => {
    it('throws RangeError for length >= 2^32', () => {
      const arrayLike = {
        0: 0,
        4294967295: 4294967295,
        4294967296: 4294967296,
        length: Math.pow(2, 32),
      }
      expect(() => toReversed(arrayLike)).toThrow(RangeError)
    })
  })

  it('true yields empty array', () => {
    expect(toReversed(true)).toEqual([])
  })

  it('false yields empty array', () => {
    expect(toReversed(false)).toEqual([])
  })

  describe('getters', () => {
    it('reads elements via getters in reverse order', () => {
      const called: number[] = []
      const o = [0, 1, 2]
      Object.defineProperty(o, '0', {
        enumerable: true,
        get() {
          called.push(0)
          return 'a'
        },
      })
      Object.defineProperty(o, '1', {
        enumerable: true,
        get() {
          called.push(1)
          return 'b'
        },
      })
      Object.defineProperty(o, '2', {
        enumerable: true,
        get() {
          called.push(2)
          return 'c'
        },
      })

      expect(toReversed(o)).toEqual(['c', 'b', 'a'])
      expect(called).toEqual([2, 1, 0])
    })

    it('handles mutation during getter', () => {
      const arr1 = [0, 1, 2]
      Object.defineProperty(arr1, '0', {
        get() {
          arr1.push(4)
          return 0
        },
      })
      expect(toReversed(arr1)).toEqual([2, 1, 0])
    })

    it('handles length mutation during getter', () => {
      const arr = [0, 1, 2, 3, 4]

      Array.prototype[1] = 5 // eslint-disable-line no-extend-native
      try {
        Object.defineProperty(arr, '3', {
          get() {
            arr.length = 1
            return 3
          },
        })

        expect(toReversed(arr)).toEqual([4, 3, undefined, 5, 0])
      } finally {
        delete (Array.prototype as any)[1]
      }
    })
  })

  it('string reverses to array', () => {
    expect(toReversed('abc')).toEqual(['c', 'b', 'a'])
  })

  it('code point is split as expected', () => {
    const halfPoo = '\uD83D'
    const endPoo = '\uDCA9'
    const poo = halfPoo + endPoo
    expect(toReversed('a' + poo + 'c')).toEqual(['c', endPoo, halfPoo, 'a'])
  })
})
