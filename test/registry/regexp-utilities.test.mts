import { describe, expect, it } from 'vitest'

import { escapeRegExp } from '../../registry/dist/lib/regexps.js'

describe('regexp utilities', () => {
  describe('escapeRegExp', () => {
    it('should escape special regex characters', () => {
      const input = '.*+?^${}()|[]\\/'
      const result = escapeRegExp(input)
      const expected = '\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\/'
      expect(result).toBe(expected)
    })

    it('should handle simple strings without special characters', () => {
      expect(escapeRegExp('hello')).toBe('hello')
      expect(escapeRegExp('world123')).toBe('world123')
      expect(escapeRegExp('test_string')).toBe('test_string')
    })

    it('should escape individual special characters', () => {
      expect(escapeRegExp('.')).toBe('\\.')
      expect(escapeRegExp('*')).toBe('\\*')
      expect(escapeRegExp('+')).toBe('\\+')
      expect(escapeRegExp('?')).toBe('\\?')
      expect(escapeRegExp('^')).toBe('\\^')
      expect(escapeRegExp('$')).toBe('\\$')
      expect(escapeRegExp('{')).toBe('\\{')
      expect(escapeRegExp('}')).toBe('\\}')
      expect(escapeRegExp('(')).toBe('\\(')
      expect(escapeRegExp(')')).toBe('\\)')
      expect(escapeRegExp('|')).toBe('\\|')
      expect(escapeRegExp('[')).toBe('\\[')
      expect(escapeRegExp(']')).toBe('\\]')
      expect(escapeRegExp('\\')).toBe('\\\\')
    })

    it('should handle empty string', () => {
      expect(escapeRegExp('')).toBe('')
    })

    it('should work with mixed content', () => {
      const input = 'user@domain.com'
      const result = escapeRegExp(input)
      expect(result).toBe('user@domain\\.com')
    })

    it('should handle file paths with special characters', () => {
      const input = 'C:\\Users\\test\\file[1].txt'
      const result = escapeRegExp(input)
      expect(result).toBe('C:\\\\Users\\\\test\\\\file\\[1\\]\\.txt')
    })

    it('should make escaped string safe for RegExp constructor', () => {
      const specialChars = '.*+?^${}()|[]\\'
      const escaped = escapeRegExp(specialChars)

      // Should not throw when creating RegExp
      expect(() => new RegExp(escaped)).not.toThrow()

      // Should match the literal string
      const regex = new RegExp(escaped)
      expect(regex.test(specialChars)).toBe(true)
      expect(regex.test('different')).toBe(false)
    })

    it('should handle repeated special characters', () => {
      expect(escapeRegExp('...')).toBe('\\.\\.\\.')
      expect(escapeRegExp('***')).toBe('\\*\\*\\*')
      expect(escapeRegExp('((()))')).toBe('\\(\\(\\(\\)\\)\\)')
    })

    it('should handle special characters mixed with normal text', () => {
      const input = 'function test() { return /.*/ }'
      const result = escapeRegExp(input)
      const expected = 'function test\\(\\) \\{ return /\\.\\*/ \\}'
      expect(result).toBe(expected)
    })

    it('should work for common use cases', () => {
      // URL patterns
      const url = 'https://example.com/path?query=value'
      const escapedUrl = escapeRegExp(url)
      expect(escapedUrl).toBe('https://example\\.com/path\\?query=value')

      // Email patterns
      const email = 'user+tag@domain.co.uk'
      const escapedEmail = escapeRegExp(email)
      expect(escapedEmail).toBe('user\\+tag@domain\\.co\\.uk')

      // Version patterns
      const version = '1.0.0-beta.1'
      const escapedVersion = escapeRegExp(version)
      expect(escapedVersion).toBe('1\\.0\\.0-beta\\.1')
    })

    it('should handle Unicode and non-ASCII characters', () => {
      const unicode = 'héllo wörld 测试'
      const result = escapeRegExp(unicode)
      expect(result).toBe('héllo wörld 测试')
    })

    it('should preserve original string when used in RegExp', () => {
      const testStrings = [
        'simple',
        'with.dots',
        'with*asterisks',
        'with+plus',
        'with?question',
        'with^caret',
        'with$dollar',
        'with{braces}',
        'with(parens)',
        'with|pipe',
        'with[brackets]',
        'with\\backslash',
      ]

      testStrings.forEach(str => {
        const escaped = escapeRegExp(str)
        const regex = new RegExp(`^${escaped}$`)
        expect(regex.test(str)).toBe(true)

        // Should not match variations
        if (str.length > 1) {
          expect(regex.test(str + 'x')).toBe(false)
          expect(regex.test('x' + str)).toBe(false)
        }
      })
    })
  })
})
