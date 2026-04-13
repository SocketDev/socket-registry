/**
 * @fileoverview Tests for string.prototype.codepointat NPM package override.
 * Ported 1:1 from upstream v1.0.1 (4dd4742e):
 * https://github.com/mathiasbynens/String.prototype.codePointAt/blob/4dd4742e/tests/tests.js
 */
import { describe, expect, it } from 'vitest'

import { setupNpmPackageTest } from '../utils/npm-package-helper.mts'

const {
  eco,
  module: codePointAt,
  skip,
  sockRegPkgName,
} = await setupNpmPackageTest(import.meta.url)

describe(`${eco} > ${sockRegPkgName}`, { skip }, () => {
  describe('String that starts with a BMP symbol', () => {
    it('returns correct code points', () => {
      expect(codePointAt('abc\uD834\uDF06def', -1)).toBe(undefined)
      expect(codePointAt('abc\uD834\uDF06def', -0)).toBe(0x61)
      expect(codePointAt('abc\uD834\uDF06def', 0)).toBe(0x61)
      expect(codePointAt('abc\uD834\uDF06def', 3)).toBe(0x1d306)
      expect(codePointAt('abc\uD834\uDF06def', 4)).toBe(0xdf06)
      expect(codePointAt('abc\uD834\uDF06def', 5)).toBe(0x64)
      expect(codePointAt('abc\uD834\uDF06def', 42)).toBe(undefined)
    })
  })

  describe('String that starts with a BMP symbol - cast position', () => {
    it('casts position argument', () => {
      expect(codePointAt('abc\uD834\uDF06def', '')).toBe(0x61)
      expect(codePointAt('abc\uD834\uDF06def', '_')).toBe(0x61)
      expect(codePointAt('abc\uD834\uDF06def')).toBe(0x61)
      expect(codePointAt('abc\uD834\uDF06def', -Infinity)).toBe(undefined)
      expect(codePointAt('abc\uD834\uDF06def', Infinity)).toBe(undefined)
      expect(codePointAt('abc\uD834\uDF06def', NaN)).toBe(0x61)
      expect(codePointAt('abc\uD834\uDF06def', false)).toBe(0x61)
      expect(codePointAt('abc\uD834\uDF06def', null)).toBe(0x61)
      expect(codePointAt('abc\uD834\uDF06def', undefined)).toBe(0x61)
    })
  })

  describe('String that starts with an astral symbol', () => {
    it('returns correct code points', () => {
      expect(codePointAt('\uD834\uDF06def', -1)).toBe(undefined)
      expect(codePointAt('\uD834\uDF06def', -0)).toBe(0x1d306)
      expect(codePointAt('\uD834\uDF06def', 0)).toBe(0x1d306)
      expect(codePointAt('\uD834\uDF06def', 1)).toBe(0xdf06)
      expect(codePointAt('\uD834\uDF06def', 42)).toBe(undefined)
    })
  })

  describe('String that starts with an astral symbol - cast position', () => {
    it('casts position argument', () => {
      expect(codePointAt('\uD834\uDF06def', '')).toBe(0x1d306)
      expect(codePointAt('\uD834\uDF06def', '1')).toBe(0xdf06)
      expect(codePointAt('\uD834\uDF06def', '_')).toBe(0x1d306)
      expect(codePointAt('\uD834\uDF06def')).toBe(0x1d306)
      expect(codePointAt('\uD834\uDF06def', false)).toBe(0x1d306)
      expect(codePointAt('\uD834\uDF06def', null)).toBe(0x1d306)
      expect(codePointAt('\uD834\uDF06def', undefined)).toBe(0x1d306)
    })
  })

  describe('Lone high surrogates', () => {
    it('returns surrogate code point', () => {
      expect(codePointAt('\uD834abc', -1)).toBe(undefined)
      expect(codePointAt('\uD834abc', -0)).toBe(0xd834)
      expect(codePointAt('\uD834abc', 0)).toBe(0xd834)
    })
  })

  describe('Lone low surrogates', () => {
    it('returns surrogate code point', () => {
      expect(codePointAt('\uDF06abc', -1)).toBe(undefined)
      expect(codePointAt('\uDF06abc', -0)).toBe(0xdf06)
      expect(codePointAt('\uDF06abc', 0)).toBe(0xdf06)
    })
  })

  describe('cast this value', () => {
    it('converts non-strings via ToString', () => {
      expect(codePointAt(42, 0)).toBe(0x34)
      expect(codePointAt(42, 1)).toBe(0x32)
      expect(
        codePointAt(
          {
            toString: function () {
              return 'abc'
            },
          },
          2,
        ),
      ).toBe(0x63)
    })
  })
})
