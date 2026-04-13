/**
 * @fileoverview Tests for is-negative-zero NPM package override.
 * Ported 1:1 from upstream v2.0.3 (8a42c03b):
 * https://github.com/inspect-js/is-negative-zero/blob/8a42c03bc623e5ceaf3f6e9e001a36d99e019649/test/index.js
 */

import { describe, expect, it } from 'vitest'

import { setupNpmPackageTest } from '../utils/npm-package-helper.mts'

const {
  eco,
  module: isNegativeZero,
  skip,
  sockRegPkgName,
} = await setupNpmPackageTest(import.meta.url)

describe(`${eco} > ${sockRegPkgName}`, { skip }, () => {
  describe('not negative zero', () => {
    it('undefined is not negative zero', () => {
      expect(isNegativeZero(undefined)).toBe(false)
    })

    it('null is not negative zero', () => {
      expect(isNegativeZero(null)).toBe(false)
    })

    it('false is not negative zero', () => {
      expect(isNegativeZero(false)).toBe(false)
    })

    it('true is not negative zero', () => {
      expect(isNegativeZero(true)).toBe(false)
    })

    it('positive zero is not negative zero', () => {
      expect(isNegativeZero(0)).toBe(false)
    })

    it('Infinity is not negative zero', () => {
      expect(isNegativeZero(Infinity)).toBe(false)
    })

    it('-Infinity is not negative zero', () => {
      expect(isNegativeZero(-Infinity)).toBe(false)
    })

    it('NaN is not negative zero', () => {
      expect(isNegativeZero(NaN)).toBe(false)
    })

    it('string is not negative zero', () => {
      expect(isNegativeZero('foo')).toBe(false)
    })

    it('array is not negative zero', () => {
      expect(isNegativeZero([])).toBe(false)
    })

    it('object is not negative zero', () => {
      expect(isNegativeZero({})).toBe(false)
    })

    it('function is not negative zero', () => {
      expect(isNegativeZero(function () {})).toBe(false)
    })

    it('-1 is not negative zero', () => {
      expect(isNegativeZero(-1)).toBe(false)
    })
  })

  describe('negative zero', () => {
    it('negative zero is negative zero', () => {
      expect(isNegativeZero(-0)).toBe(true)
    })
  })
})
