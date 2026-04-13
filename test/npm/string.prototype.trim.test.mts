/**
 * @fileoverview Tests for string.prototype.trim NPM package override.
 * Ported 1:1 from upstream v1.2.10 (0ce6d13c):
 * https://github.com/es-shims/String.prototype.trim/blob/0ce6d13c/test/tests.js
 */
import { describe, expect, it } from 'vitest'

import { setupNpmPackageTest } from '../utils/npm-package-helper.mts'

const {
  eco,
  module: trim,
  skip,
  sockRegPkgName,
} = await setupNpmPackageTest(import.meta.url)

describe(`${eco} > ${sockRegPkgName}`, { skip }, () => {
  describe('normal cases', () => {
    it('strips whitespace off left and right sides', () => {
      expect(trim(' \t\na \t\n')).toBe('a')
    })

    it('noops when no whitespace', () => {
      expect(trim('a')).toBe('a')
    })

    it('trims all expected whitespace chars', () => {
      const allWhitespaceChars =
        '\x09\x0A\x0B\x0C\x0D\x20\xA0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u202F\u205F\u3000\u2028\u2029\uFEFF'
      expect(trim(allWhitespaceChars + 'a' + allWhitespaceChars)).toBe('a')
    })
  })

  describe('zero-width spaces', () => {
    it('does not trim zero-width space', () => {
      const zeroWidth = '\u200b'
      expect(trim(zeroWidth)).toBe(zeroWidth)
    })
  })

  describe('non-whitespace characters', () => {
    it('does not trim non-whitespace', () => {
      expect(trim('\u0085')).toBe('\u0085')
      expect(trim('\u200b')).toBe('\u200b')
      expect(trim('\ufffe')).toBe('\ufffe')
    })
  })
})
