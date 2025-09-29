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

    it('should handle empty strings', () => {
      const input = ''
      const escaped = escapeRegExp(input)
      expect(escaped).toBe('')
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

    it('should handle URL-like strings', () => {
      const input = 'https://example.com/path?query=value&other=123'
      const escaped = escapeRegExp(input)
      expect(escaped).toContain('https://example\\.com')
      expect(escaped).toContain('\\?query=value')
    })

    it('should handle email-like strings', () => {
      const input = 'user+tag@example.com'
      const escaped = escapeRegExp(input)
      expect(escaped).toBe('user\\+tag@example\\.com')
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
