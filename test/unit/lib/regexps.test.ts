/**
 * @fileoverview Tests for regular expression utilities.
 *
 * Validates escapeRegExp function for proper escaping of special regex characters.
 */
import { describe, expect, it } from 'vitest'

import { escapeRegExp } from '../../../registry/dist/lib/regexps.js'

describe('regexps utilities', () => {
  describe('escapeRegExp', () => {
    it('should escape backslash', () => {
      expect(escapeRegExp('\\')).toBe('\\\\')
    })

    it('should escape pipe', () => {
      expect(escapeRegExp('|')).toBe('\\|')
    })

    it('should escape curly braces', () => {
      expect(escapeRegExp('{')).toBe('\\{')
      expect(escapeRegExp('}')).toBe('\\}')
    })

    it('should escape parentheses', () => {
      expect(escapeRegExp('(')).toBe('\\(')
      expect(escapeRegExp(')')).toBe('\\)')
    })

    it('should escape square brackets', () => {
      expect(escapeRegExp('[')).toBe('\\[')
      expect(escapeRegExp(']')).toBe('\\]')
    })

    it('should escape caret', () => {
      expect(escapeRegExp('^')).toBe('\\^')
    })

    it('should escape dollar sign', () => {
      expect(escapeRegExp('$')).toBe('\\$')
    })

    it('should escape plus', () => {
      expect(escapeRegExp('+')).toBe('\\+')
    })

    it('should escape asterisk', () => {
      expect(escapeRegExp('*')).toBe('\\*')
    })

    it('should escape question mark', () => {
      expect(escapeRegExp('?')).toBe('\\?')
    })

    it('should escape dot', () => {
      expect(escapeRegExp('.')).toBe('\\.')
    })

    it('should escape multiple special characters', () => {
      expect(escapeRegExp('.*+?^${}()|[]')).toBe(
        '\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]',
      )
    })

    it('should not escape regular characters', () => {
      expect(escapeRegExp('abc123')).toBe('abc123')
      expect(escapeRegExp('hello world')).toBe('hello world')
    })

    it('should handle empty string', () => {
      expect(escapeRegExp('')).toBe('')
    })

    it('should handle string with no special characters', () => {
      expect(escapeRegExp('test')).toBe('test')
    })

    it('should work in regex patterns', () => {
      const userInput = '*.txt'
      const escaped = escapeRegExp(userInput)
      const regex = new RegExp(escaped)
      expect(regex.test('*.txt')).toBe(true)
      expect(regex.test('file.txt')).toBe(false)
    })

    it('should handle complex strings', () => {
      const input = 'function() { return /test/; }'
      const escaped = escapeRegExp(input)
      const regex = new RegExp(escaped)
      expect(regex.test(input)).toBe(true)
    })

    it('should handle strings with backslashes', () => {
      expect(escapeRegExp('C:\\\\path\\\\file')).toBe(
        'C:\\\\\\\\path\\\\\\\\file',
      )
    })

    it('should allow escaped string to match literal characters', () => {
      const special = '$100.00'
      const escaped = escapeRegExp(special)
      const regex = new RegExp(escaped)
      expect(regex.test('$100.00')).toBe(true)
      expect(regex.test('$200.00')).toBe(false)
    })

    it('should handle mixed alphanumeric and special characters', () => {
      const input = 'test[0-9]+pattern'
      const escaped = escapeRegExp(input)
      expect(escaped).toBe('test\\[0-9\\]\\+pattern')
    })

    it('should handle Unicode characters', () => {
      expect(escapeRegExp('hello世界')).toBe('hello世界')
    })

    it('should handle strings with only special characters', () => {
      const input = '***'
      const escaped = escapeRegExp(input)
      expect(escaped).toBe('\\*\\*\\*')
    })

    it('should handle spaces and tabs', () => {
      expect(escapeRegExp('  \t  ')).toBe('  \t  ')
    })
  })
})
