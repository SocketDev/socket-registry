import { describe, expect, it } from 'vitest'

import {
  applyLinePrefix,
  camelToKebab,
  indentString,
  isBlankString,
  isNonEmptyString,
  search,
  stripAnsi,
  stripBom,
  toKebabCase,
  trimNewlines,
} from '../../registry/dist/lib/strings.js'

describe('strings module - utility functions', () => {
  describe('applyLinePrefix', () => {
    it('should apply prefix to single line', () => {
      const result = applyLinePrefix('hello', { prefix: '> ' })
      expect(result).toBe('> hello')
    })

    it('should apply prefix to multiple lines', () => {
      const result = applyLinePrefix('hello\nworld', { prefix: '> ' })
      expect(result).toBe('> hello\n> world')
    })

    it('should handle empty prefix', () => {
      const result = applyLinePrefix('hello', { prefix: '' })
      expect(result).toBe('hello')
    })

    it('should handle default prefix', () => {
      const result = applyLinePrefix('hello')
      expect(result).toBe('hello')
    })

    it('should handle empty string', () => {
      const result = applyLinePrefix('', { prefix: '> ' })
      expect(result).toBe('> ')
    })
  })

  describe('camelToKebab', () => {
    it('should convert camelCase to kebab-case', () => {
      expect(camelToKebab('helloWorld')).toBe('hello-world')
    })

    it('should handle single word', () => {
      expect(camelToKebab('hello')).toBe('hello')
    })

    it('should handle multiple capitals', () => {
      expect(camelToKebab('XMLHttpRequest')).toBe('xmlhttp-request')
    })

    it('should handle already kebab-case', () => {
      expect(camelToKebab('hello-world')).toBe('hello-world')
    })

    it('should handle empty string', () => {
      expect(camelToKebab('')).toBe('')
    })
  })

  describe('indentString', () => {
    it('should indent string by default amount', () => {
      const result = indentString('hello')
      expect(result).toBe(' hello')
    })

    it('should indent string by custom amount', () => {
      const result = indentString('hello', { count: 4 })
      expect(result).toBe('    hello')
    })

    it('should indent multiple lines', () => {
      const result = indentString('hello\nworld', { count: 1 })
      expect(result).toBe(' hello\n world')
    })

    it('should handle zero indent', () => {
      const result = indentString('hello', { count: 0 })
      expect(result).toBe('hello')
    })

    it('should handle empty string', () => {
      const result = indentString('', { count: 2 })
      expect(result).toBe('')
    })
  })

  describe('isBlankString', () => {
    it('should identify blank strings', () => {
      expect(isBlankString('')).toBe(true)
      expect(isBlankString('   ')).toBe(true)
      expect(isBlankString('\n')).toBe(true)
      expect(isBlankString('\t')).toBe(true)
    })

    it('should reject non-blank strings', () => {
      expect(isBlankString('hello')).toBe(false)
      expect(isBlankString(' hello ')).toBe(false)
    })

    it('should handle non-string values', () => {
      expect(isBlankString(null)).toBe(false)
      expect(isBlankString(undefined)).toBe(false)
      expect(isBlankString(123)).toBe(false)
    })
  })

  describe('isNonEmptyString', () => {
    it('should identify non-empty strings', () => {
      expect(isNonEmptyString('hello')).toBe(true)
      expect(isNonEmptyString(' ')).toBe(true)
      expect(isNonEmptyString('a')).toBe(true)
    })

    it('should reject empty strings', () => {
      expect(isNonEmptyString('')).toBe(false)
    })

    it('should handle non-string values', () => {
      expect(isNonEmptyString(null)).toBe(false)
      expect(isNonEmptyString(undefined)).toBe(false)
      expect(isNonEmptyString(123)).toBe(false)
    })
  })

  describe('search', () => {
    it('should find pattern in text', () => {
      const result = search('hello world', /world/)
      expect(result).toBeGreaterThan(-1)
    })

    it('should handle case insensitive search', () => {
      const result = search('Hello World', /world/i)
      expect(result).toBeGreaterThan(-1)
    })

    it('should handle regex patterns', () => {
      const result = search('hello123', /\d+/)
      expect(result).toBeGreaterThan(-1)
    })

    it('should return -1 when not found', () => {
      const result = search('hello', /world/)
      expect(result).toBe(-1)
    })

    it('should handle fromIndex parameter', () => {
      const result = search('hello world world', /world/, { fromIndex: 10 })
      expect(result).toBeGreaterThan(10)
    })

    it('should handle negative fromIndex', () => {
      const result = search('hello world', /world/, { fromIndex: -5 })
      expect(result).toBeGreaterThan(-1)
    })
  })

  describe('stripAnsi', () => {
    it('should strip ANSI codes from string', () => {
      const result = stripAnsi('\u001B[31mhello\u001B[0m')
      expect(result).toBe('hello')
    })

    it('should handle string without ANSI codes', () => {
      const result = stripAnsi('hello world')
      expect(result).toBe('hello world')
    })

    it('should handle empty string', () => {
      const result = stripAnsi('')
      expect(result).toBe('')
    })

    it('should handle multiple ANSI codes', () => {
      const result = stripAnsi('\u001B[31m\u001B[1mhello\u001B[0m')
      expect(result).toBe('hello')
    })
  })

  describe('stripBom', () => {
    it('should strip BOM from string', () => {
      const result = stripBom('\uFEFFhello')
      expect(result).toBe('hello')
    })

    it('should handle string without BOM', () => {
      const result = stripBom('hello')
      expect(result).toBe('hello')
    })

    it('should handle empty string', () => {
      const result = stripBom('')
      expect(result).toBe('')
    })

    it('should only strip leading BOM', () => {
      const result = stripBom('hello\uFEFFworld')
      expect(result).toBe('hello\uFEFFworld')
    })
  })

  describe('toKebabCase', () => {
    it('should handle camelCase', () => {
      expect(toKebabCase('helloWorld')).toBe('hello-world')
    })

    it('should handle PascalCase', () => {
      expect(toKebabCase('HelloWorld')).toBe('hello-world')
    })

    it('should handle snake_case', () => {
      expect(toKebabCase('hello_world')).toBe('hello-world')
    })

    it('should handle already kebab-case', () => {
      expect(toKebabCase('hello-world')).toBe('hello-world')
    })

    it('should handle empty string', () => {
      expect(toKebabCase('')).toBe('')
    })

    it('should handle numbers in camelCase', () => {
      expect(toKebabCase('hello2World')).toBe('hello2-world')
    })
  })

  describe('trimNewlines', () => {
    it('should trim leading newlines', () => {
      expect(trimNewlines('\n\nhello')).toBe('hello')
    })

    it('should trim trailing newlines', () => {
      expect(trimNewlines('hello\n\n')).toBe('hello')
    })

    it('should trim both leading and trailing newlines', () => {
      expect(trimNewlines('\n\nhello\n\n')).toBe('hello')
    })

    it('should preserve internal newlines', () => {
      expect(trimNewlines('\nhello\nworld\n')).toBe('hello\nworld')
    })

    it('should handle string without newlines', () => {
      expect(trimNewlines('hello')).toBe('hello')
    })

    it('should handle empty string', () => {
      expect(trimNewlines('')).toBe('')
    })
  })
})
