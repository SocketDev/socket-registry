import { describe, expect, it } from 'vitest'

import { escapeRegExp } from '../../registry/dist/lib/regexps.js'

describe('regexps module', () => {
  describe('escapeRegExp', () => {
    it('should escape all regex special characters', () => {
      const input = '.*+?^${}()|[]\\/'
      const escaped = escapeRegExp(input)
      expect(escaped).toBe('\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\/')

      // Test that the escaped string works in a regex
      const regex = new RegExp(escaped)
      expect(regex.test(input)).toBe(true)
    })

    it('should handle strings without special characters', () => {
      const input = 'hello world 123'
      const escaped = escapeRegExp(input)
      expect(escaped).toBe('hello world 123')
    })

    it('should handle empty strings', () => {
      const input = ''
      const escaped = escapeRegExp(input)
      expect(escaped).toBe('')
    })

    it('should escape dots in file extensions', () => {
      const input = 'file.txt'
      const escaped = escapeRegExp(input)
      expect(escaped).toBe('file\\.txt')

      const regex = new RegExp('^' + escaped + '$')
      expect(regex.test('file.txt')).toBe(true)
      expect(regex.test('filextxt')).toBe(false)
    })

    it('should escape parentheses', () => {
      const input = 'function(arg)'
      const escaped = escapeRegExp(input)
      expect(escaped).toBe('function\\(arg\\)')
    })

    it('should escape square brackets', () => {
      const input = 'array[0]'
      const escaped = escapeRegExp(input)
      expect(escaped).toBe('array\\[0\\]')
    })

    it('should escape curly braces', () => {
      const input = '{key: value}'
      const escaped = escapeRegExp(input)
      expect(escaped).toBe('\\{key: value\\}')
    })

    it('should escape dollar signs', () => {
      const input = '$100.00'
      const escaped = escapeRegExp(input)
      expect(escaped).toBe('\\$100\\.00')
    })

    it('should escape caret symbols', () => {
      const input = '^start'
      const escaped = escapeRegExp(input)
      expect(escaped).toBe('\\^start')
    })

    it('should escape plus signs', () => {
      const input = '1+1=2'
      const escaped = escapeRegExp(input)
      expect(escaped).toBe('1\\+1=2')
    })

    it('should escape asterisks', () => {
      const input = '*.js'
      const escaped = escapeRegExp(input)
      expect(escaped).toBe('\\*\\.js')
    })

    it('should escape question marks', () => {
      const input = 'really?'
      const escaped = escapeRegExp(input)
      expect(escaped).toBe('really\\?')
    })

    it('should escape pipe symbols', () => {
      const input = 'option1|option2'
      const escaped = escapeRegExp(input)
      expect(escaped).toBe('option1\\|option2')
    })

    it('should handle backslashes', () => {
      const input = 'path\\to\\file'
      const escaped = escapeRegExp(input)
      expect(escaped).toBe('path\\\\to\\\\file')
    })

    it('should handle forward slashes', () => {
      const input = '/path/to/file'
      const escaped = escapeRegExp(input)
      expect(escaped).toBe('/path/to/file')
    })

    it('should handle complex patterns', () => {
      const input = '(foo|bar)[0-9]+.*\\.js$'
      const escaped = escapeRegExp(input)
      const expected = '\\(foo\\|bar\\)\\[0-9\\]\\+\\.\\*\\\\\\.js\\$'
      expect(escaped).toBe(expected)

      // Verify the escaped string can be used in a regex
      const regex = new RegExp(escaped)
      expect(regex.test(input)).toBe(true)
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

    it('should handle file paths with special characters', () => {
      const input = 'C:\\Users\\test\\file[1].txt'
      const result = escapeRegExp(input)
      expect(result).toBe('C:\\\\Users\\\\test\\\\file\\[1\\]\\.txt')
    })

    it('should handle URL patterns', () => {
      const input = 'https://example.com/path?query=value'
      const escaped = escapeRegExp(input)
      expect(escaped).toBe('https://example\\.com/path\\?query=value')
    })

    it('should handle email patterns', () => {
      const input = 'user+tag@domain.co.uk'
      const escaped = escapeRegExp(input)
      expect(escaped).toBe('user\\+tag@domain\\.co\\.uk')
    })

    it('should handle version patterns', () => {
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

    it('should be idempotent for non-special characters', () => {
      const input = 'abc123XYZ'
      const escaped1 = escapeRegExp(input)
      const escaped2 = escapeRegExp(escaped1)
      // Should be the same since no special characters to escape
      expect(escaped2).toBe(escaped1)
      expect(escaped1).toBe('abc123XYZ')
    })
  })
})
