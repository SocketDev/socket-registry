/**
 * @fileoverview Tests for string.prototype.repeat NPM package override.
 * Ported 1:1 from upstream v1.0.0 (c9da0749):
 * https://github.com/mathiasbynens/String.prototype.repeat/blob/c9da0749/tests/tests.js
 */
import { describe, expect, it } from 'vitest'

import { setupNpmPackageTest } from '../utils/npm-package-helper.mts'

const {
  eco,
  module: repeat,
  skip,
  sockRegPkgName,
} = await setupNpmPackageTest(import.meta.url)

describe(`${eco} > ${sockRegPkgName}`, { skip }, () => {
  describe('cast count argument', () => {
    it('returns empty string for falsy counts', () => {
      expect(repeat('abc')).toBe('')
      expect(repeat('abc', undefined)).toBe('')
      expect(repeat('abc', null)).toBe('')
      expect(repeat('abc', false)).toBe('')
      expect(repeat('abc', NaN)).toBe('')
      expect(repeat('abc', 'abc')).toBe('')
    })
  })

  describe('invalid numeric count', () => {
    it('throws RangeError', () => {
      expect(() => repeat('abc', -Infinity)).toThrow(RangeError)
      expect(() => repeat('abc', -1)).toThrow(RangeError)
      expect(() => repeat('abc', +Infinity)).toThrow(RangeError)
    })
  })

  describe('valid numeric count', () => {
    it('repeats correctly', () => {
      expect(repeat('abc', -0)).toBe('')
      expect(repeat('abc', +0)).toBe('')
      expect(repeat('abc', 1)).toBe('abc')
      expect(repeat('abc', 2)).toBe('abcabc')
      expect(repeat('abc', 3)).toBe('abcabcabc')
      expect(repeat('abc', 4)).toBe('abcabcabcabc')
    })
  })

  describe('nullish this object', () => {
    it('throws TypeError', () => {
      expect(() => repeat(undefined)).toThrow(TypeError)
      expect(() => repeat(undefined, 4)).toThrow(TypeError)
      expect(() => repeat(null)).toThrow(TypeError)
      expect(() => repeat(null, 4)).toThrow(TypeError)
    })
  })

  describe('cast this object', () => {
    it('converts this via ToString', () => {
      expect(repeat(42, 4)).toBe('42424242')
      expect(
        repeat(
          {
            toString: function () {
              return 'abc'
            },
          },
          2,
        ),
      ).toBe('abcabc')
    })
  })
})
