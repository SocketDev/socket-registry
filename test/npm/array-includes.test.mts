/**
 * @fileoverview Tests for array-includes NPM package override.
 * Ported 1:1 from upstream v3.1.9 (afad86453393b4bde08e2ce692909078d5bccefa):
 * https://github.com/es-shims/array-includes/blob/afad86453393b4bde08e2ce692909078d5bccefa/test/tests.js
 */

import { describe, expect, it } from 'vitest'

import { setupNpmPackageTest } from '../utils/npm-package-helper.mts'

const {
  eco,
  module: includes,
  skip,
  sockRegPkgName,
} = await setupNpmPackageTest(import.meta.url)

describe(`${eco} > ${sockRegPkgName}`, { skip }, () => {
  const sparseish = { length: 5, 0: 'a', 1: 'b' } as any
  const overfullarrayish = { length: 2, 0: 'a', 1: 'b', 2: 'c' } as any
  const thrower = {
    valueOf() {
      throw new RangeError('whoa')
    },
  }
  const numberish = {
    valueOf() {
      return 2
    },
  }

  describe('simple examples', () => {
    it('[1, 2, 3] includes 1', () => {
      expect(includes([1, 2, 3], 1)).toBe(true)
    })

    it('[1, 2, 3] does not include 4', () => {
      expect(includes([1, 2, 3], 4)).toBe(false)
    })

    it('[NaN] includes NaN', () => {
      expect(includes([NaN], NaN)).toBe(true)
    })
  })

  it('does not skip holes', () => {
    expect(includes(Array(1), undefined)).toBe(true)
  })

  describe('exceptions', () => {
    it('fromIndex conversion throws', () => {
      expect(() => includes([0], 0, thrower)).toThrow(RangeError)
    })

    it('ToLength conversion throws', () => {
      expect(() => includes({ length: thrower, 0: true } as any, true)).toThrow(
        RangeError,
      )
    })
  })

  describe('arraylike', () => {
    it('sparse array-like object includes "a"', () => {
      expect(includes(sparseish, 'a')).toBe(true)
    })

    it('sparse array-like object does not include "c"', () => {
      expect(includes(sparseish, 'c')).toBe(false)
    })

    it('overfull array-like object includes "b"', () => {
      expect(includes(overfullarrayish, 'b')).toBe(true)
    })

    it('overfull array-like object does not include "c"', () => {
      expect(includes(overfullarrayish, 'c')).toBe(false)
    })
  })

  describe('fromIndex', () => {
    it('NaN fromIndex -> 0 fromIndex', () => {
      expect(includes([1], 1, NaN)).toBe(true)
    })

    it('starting from 0 finds index 1', () => {
      expect(includes([0, 1, 2], 1, 0)).toBe(true)
    })

    it('starting from 1 finds index 1', () => {
      expect(includes([0, 1, 2], 1, 1)).toBe(true)
    })

    it('starting from 2 does not find index 1', () => {
      expect(includes([0, 1, 2], 1, 2)).toBe(false)
    })

    describe('number coercion', () => {
      it('does not find "a" with object fromIndex coercing to 2', () => {
        expect(includes(['a', 'b', 'c'], 'a', numberish as any)).toBe(false)
      })

      it('does not find "a" with string fromIndex coercing to 2', () => {
        expect(includes(['a', 'b', 'c'], 'a', '2' as any)).toBe(false)
      })

      it('finds "c" with object fromIndex coercing to 2', () => {
        expect(includes(['a', 'b', 'c'], 'c', numberish as any)).toBe(true)
      })

      it('finds "c" with string fromIndex coercing to 2', () => {
        expect(includes(['a', 'b', 'c'], 'c', '2' as any)).toBe(true)
      })
    })

    describe('fromIndex greater than length', () => {
      it('array of length 1 is not searched if fromIndex is > 1', () => {
        expect(includes([1], 1, 2)).toBe(false)
      })

      it('array of length 1 is not searched if fromIndex is >= 1', () => {
        expect(includes([1], 1, 1)).toBe(false)
      })

      it('array of length 1 is not searched if fromIndex is 1.1', () => {
        expect(includes([1], 1, 1.1)).toBe(false)
      })

      it('array of length 1 is not searched if fromIndex is Infinity', () => {
        expect(includes([1], 1, Infinity)).toBe(false)
      })
    })

    describe('negative fromIndex', () => {
      it('computed length would be negative; fromIndex is thus 0 (value 1)', () => {
        expect(includes([1, 3], 1, -4)).toBe(true)
      })

      it('computed length would be negative; fromIndex is thus 0 (value 3)', () => {
        expect(includes([1, 3], 3, -4)).toBe(true)
      })

      it('computed length would be negative; fromIndex is thus 0 (-Infinity)', () => {
        expect(includes([1, 3], 1, -Infinity)).toBe(true)
      })

      it('finds -1st item with -1 fromIndex', () => {
        expect(includes([12, 13], 13, -1)).toBe(true)
      })

      it('does not find -2nd item with -1 fromIndex', () => {
        expect(includes([12, 13], 12, -1)).toBe(false)
      })

      it('finds -2nd item with -2 fromIndex', () => {
        expect(includes([12, 13], 13, -2)).toBe(true)
      })

      it('finds -4th item with -4 fromIndex in sparse array-like', () => {
        expect(includes(sparseish, 'b', -4)).toBe(true)
      })

      it('does not find -5th item with -4 fromIndex in sparse array-like', () => {
        expect(includes(sparseish, 'a', -4)).toBe(false)
      })

      it('finds -5th item with -5 fromIndex in sparse array-like', () => {
        expect(includes(sparseish, 'a', -5)).toBe(true)
      })
    })
  })

  describe('strings', () => {
    it('string includes one of its chars', () => {
      expect(includes('abc', 'c')).toBe(true)
    })

    it('string does not include a char it should not', () => {
      expect(includes('abc', 'd')).toBe(false)
    })

    it('boxed string includes one of its chars', () => {
      expect(includes(Object('abc'), 'c')).toBe(true)
    })

    it('boxed string does not include a char it should not', () => {
      expect(includes(Object('abc'), 'd')).toBe(false)
    })
  })
})
