/**
 * @file Tests for string.prototype.trim NPM package override. Ported 1:1 from
 *   upstream v1.2.11 (main):
 *   https://github.com/es-shims/String.prototype.trim/blob/main/test/tests.js.
 */
import { describe, expect, it } from 'vitest'

import { setupNpmPackageTest } from '../util/npm-package-helper.mts'

const {
  eco,
  module: trim,
  skip,
  sockRegPkgName,
} = setupNpmPackageTest(import.meta.url)

describe(`${eco} > ${sockRegPkgName}`, { skip }, () => {
  describe('normal cases', () => {
    it('strips whitespace off left and right sides', () => {
      expect(trim(' \t\na \t\n')).toBe('a')
    })

    it('noops when no whitespace', () => {
      expect(trim('a')).toBe('a')
    })

    it('strips whitespace off left side only', () => {
      expect(trim(' a')).toBe('a')
    })

    it('strips whitespace off right side only', () => {
      expect(trim('a ')).toBe('a')
    })

    it('trims all expected whitespace chars', () => {
      const allWhitespaceChars =
        '\x09\x0A\x0B\x0C\x0D\x20\xA0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u202F\u205F\u3000\u2028\u2029\uFEFF'
      expect(trim(allWhitespaceChars + 'a' + allWhitespaceChars)).toBe('a')
    })
  })

  describe('pathological cases', () => {
    it('trims a long run of internal-turned-trailing whitespace', () => {
      const input = `A${' '.repeat(100_000)}A`
      expect(trim(input)).toBe(input)
    })

    it('trims trailing whitespace while preserving internal whitespace', () => {
      const middle = ' '.repeat(100_000)
      const input = `A${middle}A${middle}`
      expect(trim(input)).toBe(`A${middle}A`)
    })
  })

  describe('mongolian vowel separator', () => {
    // See https://codeblog.jonskeet.uk/2014/12/01/when-is-an-identifier-not-an-identifier-attack-of-the-mongolian-vowel-separator/
    const mongolianVowelSeparator = '\u180e'
    const mvsIsWS = /^\s$/.test(mongolianVowelSeparator)

    it('is not treated as whitespace between characters', () => {
      expect(
        trim(`${mongolianVowelSeparator}a${mongolianVowelSeparator}`),
      ).toBe(
        mvsIsWS ? 'a' : `${mongolianVowelSeparator}a${mongolianVowelSeparator}`,
      )
    })

    it('is not treated as whitespace alone', () => {
      expect(trim(mongolianVowelSeparator)).toBe(
        mvsIsWS ? '' : mongolianVowelSeparator,
      )
    })

    it('is not treated as leading whitespace', () => {
      expect(trim(`_${mongolianVowelSeparator}`)).toBe(
        `_${mvsIsWS ? '' : mongolianVowelSeparator}`,
      )
    })

    it('is not treated as trailing whitespace', () => {
      expect(trim(`${mongolianVowelSeparator}_`)).toBe(
        `${mvsIsWS ? '' : mongolianVowelSeparator}_`,
      )
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
