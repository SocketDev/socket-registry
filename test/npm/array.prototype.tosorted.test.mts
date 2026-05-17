/**
 * @fileoverview Tests for array.prototype.tosorted NPM package override.
 * Ported 1:1 from upstream v1.1.4 (850c48e17f4eeffd1eaeff5898b083916224dfef):
 * https://github.com/es-shims/Array.prototype.toSorted/blob/850c48e17f4eeffd1eaeff5898b083916224dfef/test/tests.js
 */

import { describe, expect, it } from 'vitest'

import { setupNpmPackageTest } from '../util/npm-package-helper.mts'

const {
  eco,
  module: toSorted,
  skip,
  sockRegPkgName,
} = await setupNpmPackageTest(import.meta.url)

describe(`${eco} > ${sockRegPkgName}`, { skip }, () => {
  it('sorts an array', () => {
    const nums = [2, 1, 3]
    const result = toSorted(nums)
    expect(result).toEqual([1, 2, 3])
    expect(nums).not.toBe(result)
    expect(nums).toEqual([2, 1, 3])

    nums.sort()
    expect(nums).toEqual(result)
  })

  it('string sorts to array', () => {
    expect(toSorted('acab')).toEqual(['a', 'a', 'b', 'c'])
  })

  it('code point is sorted as expected', () => {
    const halfPoo = '\uD83D'
    const endPoo = '\uDCA9'
    const poo = halfPoo + endPoo
    expect(toSorted('a' + poo + 'c')).toEqual(['a', 'c', halfPoo, endPoo])
  })

  it('handles array-like with length valueOf', () => {
    const arrayLikeLengthValueOf = {
      length: {
        valueOf() {
          return 2
        },
      },
      0: 4,
      1: 0,
      2: 1,
    }
    expect(toSorted(arrayLikeLengthValueOf)).toEqual([0, 4])
  })

  describe('not positive integer lengths', () => {
    it('negative length yields empty array', () => {
      expect(toSorted({ length: -2 })).toEqual([])
    })

    it('string length yields empty array', () => {
      expect(toSorted({ length: 'dog' })).toEqual([])
    })

    it('NaN length yields empty array', () => {
      expect(toSorted({ length: NaN })).toEqual([])
    })
  })

  describe('getters', () => {
    it('reads elements via getters', () => {
      const getCalls: number[] = []

      const arrayLike: Record<string, any> = {
        0: 2,
        1: 1,
        2: 3,
        length: 3,
      }
      Object.defineProperty(arrayLike, '0', {
        get() {
          getCalls.push(0)
          return 2
        },
      })
      Object.defineProperty(arrayLike, '1', {
        get() {
          getCalls.push(1)
          return 1
        },
      })
      Object.defineProperty(arrayLike, '2', {
        get() {
          getCalls.push(2)
          return 3
        },
      })

      const up = { gross: true }
      let caught: unknown
      try {
        toSorted(arrayLike, () => {
          throw up
        })
      } catch (e) {
        caught = e
      }
      expect(caught).toBe(up)
      expect(getCalls).toEqual([0, 1, 2])
    })

    it('handles mutation during getter', () => {
      const arr1 = [5, 0, 3]
      Object.defineProperty(arr1, '0', {
        get() {
          arr1.push(1)
          return 5
        },
      })
      expect(toSorted(arr1)).toEqual([0, 3, 5])
    })

    it('handles length mutation during getter', () => {
      const arr = [5, 1, 4, 6, 3]
      Array.prototype[3] = 2 // eslint-disable-line no-extend-native
      try {
        Object.defineProperty(arr, '2', {
          get() {
            arr.length = 1
            return 4
          },
        })

        expect(toSorted(arr)).toEqual([1, 2, 4, 5, undefined])
      } finally {
        delete (Array.prototype as any)[3]
      }
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
      expect(() => toSorted(arrayLike)).toThrow(RangeError)
    })
  })

  it('true yields empty array', () => {
    expect(toSorted(true)).toEqual([])
  })

  it('false yields empty array', () => {
    expect(toSorted(false)).toEqual([])
  })

  describe('holes', () => {
    it('fills holes from prototype', () => {
      // eslint-disable-next-line no-sparse-arrays
      const arr = [3, , 4, , 1]
      Array.prototype[3] = 2 // eslint-disable-line no-extend-native
      try {
        const sorted = toSorted(arr)
        expect(sorted).toEqual([1, 2, 3, 4, undefined])
        expect(Object.prototype.hasOwnProperty.call(sorted, 4)).toBe(true)
      } finally {
        delete (Array.prototype as any)[3]
      }
    })
  })
})
