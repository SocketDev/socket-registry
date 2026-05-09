/**
 * @fileoverview Tests for string.prototype.startswith NPM package override.
 * Ported 1:1 from upstream v1.0.1 (10f437ce):
 * https://github.com/mathiasbynens/String.prototype.startsWith/blob/10f437ce/tests/tests.js
 */
import { describe, expect, it } from 'vitest'

import { setupNpmPackageTest } from '../utils/npm-package-helper.mts'

const {
  eco,
  module: startsWith,
  skip,
  sockRegPkgName,
} = await setupNpmPackageTest(import.meta.url)

describe(`${eco} > ${sockRegPkgName}`, { skip }, () => {
  describe('"undefined" this string', () => {
    it('handles undefined/null search', () => {
      expect(startsWith('undefined')).toBe(true)
      expect(startsWith('undefined', undefined)).toBe(true)
      expect(startsWith('undefined', undefined)).toBe(false)
    })
  })

  describe('"null" this string', () => {
    it('handles undefined/null search', () => {
      expect(startsWith('null')).toBe(false)
      expect(startsWith('null', undefined)).toBe(false)
      expect(startsWith('null', undefined)).toBe(true)
    })
  })

  describe('without position argument', () => {
    it('checks string start', () => {
      expect(startsWith('abc')).toBe(false)
      expect(startsWith('abc', '')).toBe(true)
      expect(startsWith('abc', '\0')).toBe(false)
      expect(startsWith('abc', 'a')).toBe(true)
      expect(startsWith('abc', 'b')).toBe(false)
      expect(startsWith('abc', 'ab')).toBe(true)
      expect(startsWith('abc', 'bc')).toBe(false)
      expect(startsWith('abc', 'abc')).toBe(true)
      expect(startsWith('abc', 'bcd')).toBe(false)
      expect(startsWith('abc', 'abcd')).toBe(false)
    })
  })

  describe('position 1', () => {
    it('starts from position 1', () => {
      expect(startsWith('abc', '', 1)).toBe(true)
      expect(startsWith('abc', 'a', 1)).toBe(false)
      expect(startsWith('abc', 'b', 1)).toBe(true)
      expect(startsWith('abc', 'bc', 1)).toBe(true)
      expect(startsWith('abc', 'abc', 1)).toBe(false)
    })
  })

  describe('position +Infinity', () => {
    it('returns true only for empty search', () => {
      expect(startsWith('abc', '', +Infinity)).toBe(true)
      expect(startsWith('abc', 'a', +Infinity)).toBe(false)
      expect(startsWith('abc', 'b', +Infinity)).toBe(false)
      expect(startsWith('abc', 'abc', +Infinity)).toBe(false)
    })
  })

  describe('RegExp search string', () => {
    it('throws TypeError for regex', () => {
      expect(startsWith('[a-z]+(bar)?', '[a-z]+')).toBe(true)
      expect(() => startsWith('[a-z]+(bar)?', /[a-z]+/)).toThrow(TypeError)
      expect(startsWith('[a-z]+(bar)?', '(bar)?', 6)).toBe(true)
      expect(() => startsWith('[a-z]+(bar)?', /(bar)?/)).toThrow(TypeError)
    })
  })

  describe('surrogate pairs', () => {
    it('handles unicode strings', () => {
      const string =
        'I\xF1t\xEBrn\xE2ti\xF4n\xE0liz\xE6ti\xF8n\u2603\uD83D\uDCA9'
      expect(startsWith(string, '')).toBe(true)
      expect(startsWith(string, '\xF1t\xEBr')).toBe(false)
      expect(startsWith(string, '\xF1t\xEBr', 1)).toBe(true)
      expect(startsWith(string, '\u2603')).toBe(false)
      expect(startsWith(string, '\u2603', 20)).toBe(true)
      expect(startsWith(string, '\uD83D\uDCA9')).toBe(false)
      expect(startsWith(string, '\uD83D\uDCA9', 21)).toBe(true)
    })
  })

  describe('nullish this object', () => {
    it('throws TypeError', () => {
      expect(() => startsWith(undefined)).toThrow(TypeError)
      expect(() => startsWith(undefined, 'b')).toThrow(TypeError)
      expect(() => startsWith(undefined)).toThrow(TypeError)
      expect(() => startsWith(undefined, 'b')).toThrow(TypeError)
    })
  })

  describe('cast this object', () => {
    it('converts this via ToString', () => {
      expect(startsWith(42, '2')).toBe(false)
      expect(startsWith(42, '4')).toBe(true)
      expect(startsWith(42, '2', 1)).toBe(true)
      expect(
        startsWith(
          {
            toString: function () {
              return 'abc'
            },
          },
          'b',
          0,
        ),
      ).toBe(false)
      expect(
        startsWith(
          {
            toString: function () {
              return 'abc'
            },
          },
          'b',
          1,
        ),
      ).toBe(true)
    })
  })
})
