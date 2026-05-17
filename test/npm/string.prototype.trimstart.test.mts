/**
 * @fileoverview Tests for string.prototype.trimstart NPM package override.
 * Ported 1:1 from upstream v1.0.8 (e0ebce2a):
 * https://github.com/es-shims/String.prototype.trimStart/blob/e0ebce2a/test/tests.js
 */
import { describe, expect, it } from 'vitest'

import { setupNpmPackageTest } from '../util/npm-package-helper.mts'

const {
  eco,
  module: trimStart,
  skip,
  sockRegPkgName,
} = await setupNpmPackageTest(import.meta.url)

describe(`${eco} > ${sockRegPkgName}`, { skip }, () => {
  describe('normal cases', () => {
    it('strips whitespace off the left side', () => {
      expect(trimStart(' \t\na \t\n')).toBe('a \t\n')
    })

    it('noops when no whitespace', () => {
      expect(trimStart('a')).toBe('a')
    })

    it('trims all expected whitespace chars from start', () => {
      const allWhitespaceChars =
        '\x09\x0A\x0B\x0C\x0D\x20\xA0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u202F\u205F\u3000\u2028\u2029\uFEFF'
      expect(trimStart(allWhitespaceChars + 'a' + allWhitespaceChars)).toBe(
        'a' + allWhitespaceChars,
      )
    })
  })

  describe('mongolian vowel separator', () => {
    it('handles mongolian vowel separator based on unicode version', () => {
      const mongolianVowelSeparator = '\u180E'
      const mvsIsWS = /^\s$/.test(mongolianVowelSeparator)
      expect(
        trimStart(mongolianVowelSeparator + 'a' + mongolianVowelSeparator),
      ).toBe(
        (mvsIsWS ? '' : mongolianVowelSeparator) +
          'a' +
          mongolianVowelSeparator,
      )
    })
  })

  describe('zero-width spaces', () => {
    it('does not trim zero-width space', () => {
      const zeroWidth = '\u200b'
      expect(trimStart(zeroWidth)).toBe(zeroWidth)
    })
  })
})
