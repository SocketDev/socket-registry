/**
 * @fileoverview Tests for string.prototype.includes NPM package override.
 * Ported 1:1 from upstream v2.0.1 (4dd89acb):
 * https://github.com/mathiasbynens/String.prototype.includes/blob/4dd89acb/tests/tests.js
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
  describe('cast searchString arg', () => {
    it('handles various types', () => {
      expect(includes('abc')).toBe(false)
      expect(includes('aundefinedb')).toBe(true)
      expect(includes('abc', undefined)).toBe(false)
      expect(includes('aundefinedb', undefined)).toBe(true)
      expect(includes('abc', undefined)).toBe(false)
      // oxlint-disable-next-line socket/prefer-undefined-over-null -- spec: includes stringifies null to "null".
      expect(includes('abc', null)).toBe(false)
      // oxlint-disable-next-line socket/prefer-undefined-over-null -- spec: includes stringifies null to "null", matches 'anullb'.
      expect(includes('anullb', null)).toBe(true)
      expect(includes('abc', false)).toBe(false)
      expect(includes('afalseb', false)).toBe(true)
      expect(includes('abc', NaN)).toBe(false)
      expect(includes('aNaNb', NaN)).toBe(true)
    })
  })

  describe('basic support', () => {
    it('checks string inclusion', () => {
      expect(includes('abc', 'abc')).toBe(true)
      expect(includes('abc', 'def')).toBe(false)
      expect(includes('abc', '')).toBe(true)
      expect(includes('', '')).toBe(true)
      expect(includes('abc', 'bc')).toBe(true)
      expect(includes('abc', 'bc\0')).toBe(false)
    })
  })

  describe('pos argument', () => {
    it('respects position', () => {
      expect(includes('abc', 'b', -Infinity)).toBe(true)
      expect(includes('abc', 'b', -1)).toBe(true)
      expect(includes('abc', 'b', -0)).toBe(true)
      expect(includes('abc', 'b', +0)).toBe(true)
      expect(includes('abc', 'b', NaN)).toBe(true)
      expect(includes('abc', 'b', 'x')).toBe(true)
      expect(includes('abc', 'b', false)).toBe(true)
      expect(includes('abc', 'b', undefined)).toBe(true)
      // oxlint-disable-next-line socket/prefer-undefined-over-null -- spec: ToInteger(null) === 0, matches 'b' at position 0.
      expect(includes('abc', 'b', null)).toBe(true)
      expect(includes('abc', 'b', 1)).toBe(true)
      expect(includes('abc', 'b', 2)).toBe(false)
      expect(includes('abc', 'b', 3)).toBe(false)
      expect(includes('abc', 'b', 4)).toBe(false)
      expect(includes('abc', 'b', Number(Infinity))).toBe(false)
    })
  })

  describe('regex searchString', () => {
    it('throws TypeError for regex', () => {
      expect(includes('foo[a-z]+(bar)?', '[a-z]+')).toBe(true)
      expect(() => includes('foo[a-z]+(bar)?', /[a-z]+/)).toThrow(TypeError)
      expect(includes('foo[a-z]+(bar)?', '(bar)?')).toBe(true)
      expect(() => includes('foo[a-z]+(bar)?', /(bar)?/)).toThrow(TypeError)
    })
  })

  describe('nullish this object', () => {
    it('throws TypeError for null/undefined', () => {
      expect(() => includes(undefined)).toThrow(TypeError)
      expect(() => includes(undefined, 'b')).toThrow(TypeError)
      expect(() => includes(undefined)).toThrow(TypeError)
      expect(() => includes(undefined, 'b')).toThrow(TypeError)
    })
  })

  describe('cast this object', () => {
    it('converts this via ToString', () => {
      expect(includes(42, '2')).toBe(true)
      expect(includes(42, 'b', 4)).toBe(false)
      expect(
        includes(
          {
            toString: function () {
              return 'abc'
            },
          },
          'b',
          0,
        ),
      ).toBe(true)
    })
  })
})
