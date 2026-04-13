/**
 * @fileoverview Tests for string.prototype.trimright NPM package override.
 * Ported 1:1 from upstream v2.1.3 (9228baa6):
 * https://github.com/es-shims/String.prototype.trimRight/blob/9228baa6/test/tests.js
 */
import { describe, expect, it } from 'vitest'

import { setupNpmPackageTest } from '../utils/npm-package-helper.mts'

const {
  eco,
  module: trimRight,
  skip,
  sockRegPkgName,
} = await setupNpmPackageTest(import.meta.url)

describe(`${eco} > ${sockRegPkgName}`, { skip }, () => {
  describe('normal cases', () => {
    it('strips whitespace off the right side', () => {
      expect(trimRight(' \t\na \t\n')).toBe(' \t\na')
    })

    it('noops when no whitespace', () => {
      expect(trimRight('a')).toBe('a')
    })

    it('trims all expected whitespace chars from end', () => {
      const allWhitespaceChars =
        '\x09\x0A\x0B\x0C\x0D\x20\xA0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u202F\u205F\u3000\u2028\u2029\uFEFF'
      expect(trimRight(allWhitespaceChars + 'a' + allWhitespaceChars)).toBe(
        allWhitespaceChars + 'a',
      )
    })
  })

  describe('zero-width spaces', () => {
    it('does not trim zero-width space', () => {
      const zeroWidth = '\u200b'
      expect(trimRight(zeroWidth)).toBe(zeroWidth)
    })
  })
})
