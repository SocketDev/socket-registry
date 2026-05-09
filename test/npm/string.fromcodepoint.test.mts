/**
 * @fileoverview Tests for string.fromcodepoint NPM package override.
 * Ported 1:1 from upstream v1.0.3 (e3cfae0b):
 * https://github.com/mathiasbynens/String.fromCodePoint/blob/e3cfae0b/tests/tests.js
 */
import { describe, expect, it } from 'vitest'

import { setupNpmPackageTest } from '../utils/npm-package-helper.mts'

const {
  eco,
  module: fromCodePoint,
  skip,
  sockRegPkgName,
} = await setupNpmPackageTest(import.meta.url)

describe(`${eco} > ${sockRegPkgName}`, { skip }, () => {
  it('returns empty string with no arguments', () => {
    expect(fromCodePoint()).toBe('')
  })

  describe('cast to 0', () => {
    it('converts falsy values to \\0', () => {
      expect(fromCodePoint('')).toBe('\0')
      expect(fromCodePoint(-0)).toBe('\0')
      expect(fromCodePoint(0)).toBe('\0')
      expect(fromCodePoint(false)).toBe('\0')
      expect(fromCodePoint(undefined)).toBe('\0')
    })
  })

  describe('astral code points', () => {
    it('handles astral code points', () => {
      expect(fromCodePoint(0x1d306)).toBe('\uD834\uDF06')
      expect(fromCodePoint(0x1d306, 0x61, 0x1d307)).toBe(
        '\uD834\uDF06a\uD834\uDF07',
      )
      expect(fromCodePoint(0x61, 0x62, 0x1d307)).toBe('ab\uD834\uDF07')
    })
  })

  describe('invalid code points', () => {
    it('throws RangeError for invalid values', () => {
      expect(() => fromCodePoint('_')).toThrow(RangeError)
      expect(() => fromCodePoint('+Infinity')).toThrow(RangeError)
      expect(() => fromCodePoint('-Infinity')).toThrow(RangeError)
      expect(() => fromCodePoint(-1)).toThrow(RangeError)
      expect(() => fromCodePoint(0x10ffff + 1)).toThrow(RangeError)
      expect(() => fromCodePoint(3.14)).toThrow(RangeError)
      expect(() => fromCodePoint(3e-2)).toThrow(RangeError)
      expect(() => fromCodePoint(-Infinity)).toThrow(RangeError)
      expect(() => fromCodePoint(Number(Infinity))).toThrow(RangeError)
      expect(() => fromCodePoint(NaN)).toThrow(RangeError)
      expect(() => fromCodePoint(undefined)).toThrow(RangeError)
      expect(() => fromCodePoint({})).toThrow(RangeError)
      expect(() => fromCodePoint(/./)).toThrow(RangeError)
    })
  })

  describe('cast code point', () => {
    it('uses valueOf on objects', () => {
      let tmp = 0x60
      expect(
        fromCodePoint({
          valueOf: function () {
            ++tmp
            return tmp
          },
        }),
      ).toBe('a')
      expect(tmp).toBe(0x61)
    })
  })

  describe('long arguments list', () => {
    it('does not throw for large argument lists', () => {
      let counter = (Math.pow(2, 15) * 3) / 2
      let result: number[] = []
      while (--counter >= 0) {
        result.push(0)
      }
      expect(() => fromCodePoint.apply(undefined, result)).not.toThrow()

      counter = (Math.pow(2, 15) * 3) / 2
      result = []
      while (--counter >= 0) {
        result.push(0xffff + 1)
      }
      expect(() => fromCodePoint.apply(undefined, result)).not.toThrow()
    })
  })
})
