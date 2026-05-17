/**
 * @fileoverview Tests for string.prototype.endswith NPM package override.
 * Ported 1:1 from upstream v1.0.2 (3803a49d):
 * https://github.com/mathiasbynens/String.prototype.endsWith/blob/3803a49d/test/tests.js
 */
import { describe, expect, it } from 'vitest'

import { setupNpmPackageTest } from '../util/npm-package-helper.mts'

const {
  eco,
  module: endsWith,
  skip,
  sockRegPkgName,
} = await setupNpmPackageTest(import.meta.url)

describe(`${eco} > ${sockRegPkgName}`, { skip }, () => {
  describe('nullish search string', () => {
    it('handles undefined and null', () => {
      expect(endsWith('undefined')).toBe(true)
      expect(endsWith('undefined', undefined)).toBe(true)
      // oxlint-disable-next-line socket/prefer-undefined-over-null -- spec: endsWith stringifies null to "null", not "undefined".
      expect(endsWith('undefined', null)).toBe(false)
      expect(endsWith('null')).toBe(false)
      expect(endsWith('null', undefined)).toBe(false)
      // oxlint-disable-next-line socket/prefer-undefined-over-null -- spec: endsWith stringifies null to "null", matches 'null'.
      expect(endsWith('null', null)).toBe(true)
    })
  })

  describe('basic support', () => {
    it('checks string endings', () => {
      expect(endsWith('abc')).toBe(false)
      expect(endsWith('abc', '')).toBe(true)
      expect(endsWith('abc', '\0')).toBe(false)
      expect(endsWith('abc', 'c')).toBe(true)
      expect(endsWith('abc', 'b')).toBe(false)
      expect(endsWith('abc', 'ab')).toBe(false)
      expect(endsWith('abc', 'bc')).toBe(true)
      expect(endsWith('abc', 'abc')).toBe(true)
      expect(endsWith('abc', 'bcd')).toBe(false)
      expect(endsWith('abc', 'abcd')).toBe(false)
      expect(endsWith('abc', 'bcde')).toBe(false)
    })
  })

  describe('position argument - NaN', () => {
    it('treats NaN as 0', () => {
      expect(endsWith('abc', '', NaN)).toBe(true)
      expect(endsWith('abc', '\0', NaN)).toBe(false)
      expect(endsWith('abc', 'c', NaN)).toBe(false)
      expect(endsWith('abc', 'b', NaN)).toBe(false)
      expect(endsWith('abc', 'a', NaN)).toBe(false)
      expect(endsWith('abc', 'abc', NaN)).toBe(false)
    })
  })

  describe('position argument - 1', () => {
    it('limits search to position 1', () => {
      expect(endsWith('abc', '', 1)).toBe(true)
      expect(endsWith('abc', 'a', 1)).toBe(true)
      expect(endsWith('abc', 'b', 1)).toBe(false)
      expect(endsWith('abc', 'c', 1)).toBe(false)
      expect(endsWith('abc', 'abc', 1)).toBe(false)
    })
  })

  describe('position argument - 2', () => {
    it('limits search to position 2', () => {
      expect(endsWith('abc', '', 2)).toBe(true)
      expect(endsWith('abc', 'b', 2)).toBe(true)
      expect(endsWith('abc', 'ab', 2)).toBe(true)
      expect(endsWith('abc', 'c', 2)).toBe(false)
      expect(endsWith('abc', 'abc', 2)).toBe(false)
    })
  })

  describe('position argument - +Infinity', () => {
    it('treats Infinity as full length', () => {
      expect(endsWith('abc', '', Number(Infinity))).toBe(true)
      expect(endsWith('abc', 'c', Number(Infinity))).toBe(true)
      expect(endsWith('abc', 'bc', Number(Infinity))).toBe(true)
      expect(endsWith('abc', 'abc', Number(Infinity))).toBe(true)
      expect(endsWith('abc', 'bcd', Number(Infinity))).toBe(false)
    })
  })

  describe('search regexp', () => {
    it('throws TypeError for regex search string', () => {
      expect(endsWith('[a-z]+(bar)?', '(bar)?')).toBe(true)
      expect(() => endsWith('[a-z]+(bar)?', /(bar)?/)).toThrow(TypeError)
      expect(endsWith('[a-z]+(bar)?', '[a-z]+', 6)).toBe(true)
    })
  })

  describe('nullish this object', () => {
    it('throws TypeError for null/undefined this', () => {
      expect(() => endsWith(undefined)).toThrow(TypeError)
      expect(() => endsWith(undefined, 'b')).toThrow(TypeError)
      expect(() => endsWith(undefined)).toThrow(TypeError)
      expect(() => endsWith(undefined, 'b')).toThrow(TypeError)
    })
  })

  describe('cast this object', () => {
    it('converts this via ToString', () => {
      expect(endsWith(42, '2')).toBe(true)
      expect(endsWith(42, '4')).toBe(false)
      expect(endsWith(42, '2', 4)).toBe(true)
      expect(
        endsWith(
          {
            toString: function () {
              return 'abc'
            },
          },
          'b',
          2,
        ),
      ).toBe(true)
    })
  })
})
