/**
 * @fileoverview Tests for string.prototype.trimleft NPM package override.
 * Ported 1:1 from upstream v2.1.3 (ff9bea31):
 * https://github.com/es-shims/String.prototype.trimLeft/blob/ff9bea31/test/tests.js
 */
import { describe, expect, it } from 'vitest'

import { setupNpmPackageTest } from '../util/npm-package-helper.mts'

const {
  eco,
  module: trimLeft,
  skip,
  sockRegPkgName,
} = await setupNpmPackageTest(import.meta.url)

describe(`${eco} > ${sockRegPkgName}`, { skip }, () => {
  describe('normal cases', () => {
    it('strips whitespace off the left side', () => {
      expect(trimLeft(' \t\na \t\n')).toBe('a \t\n')
    })

    it('noops when no whitespace', () => {
      expect(trimLeft('a')).toBe('a')
    })

    it('trims all expected whitespace chars from start', () => {
      const allWhitespaceChars =
        '\x09\x0A\x0B\x0C\x0D\x20\xA0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u202F\u205F\u3000\u2028\u2029\uFEFF'
      expect(trimLeft(allWhitespaceChars + 'a' + allWhitespaceChars)).toBe(
        'a' + allWhitespaceChars,
      )
    })
  })

  describe('zero-width spaces', () => {
    it('does not trim zero-width space', () => {
      const zeroWidth = '\u200b'
      expect(trimLeft(zeroWidth)).toBe(zeroWidth)
    })
  })
})
