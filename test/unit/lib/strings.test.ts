/**
 * @fileoverview Tests for string manipulation utilities.
 *
 * Validates string formatting, conversion, and manipulation functions.
 */

import {
  applyLinePrefix,
  camelToKebab,
  centerText,
  fromCharCode,
  indentString,
  isBlankString,
  isNonEmptyString,
  repeatString,
  search,
  stringWidth,
  stripAnsi,
  stripBom,
  toKebabCase,
  trimNewlines,
} from '@socketsecurity/lib/strings'
import { describe, expect, it } from 'vitest'

describe('strings utilities', () => {
  describe('fromCharCode', () => {
    it('should convert char codes to string', () => {
      const result = fromCharCode(65, 66, 67)
      expect(result).toBe('ABC')
    })

    it('should handle single char code', () => {
      const result = fromCharCode(72)
      expect(result).toBe('H')
    })

    it('should handle special characters', () => {
      // newline.
      const result = fromCharCode(10)
      expect(result).toBe('\n')
    })

    it('should handle Unicode', () => {
      // 😀
      const result = fromCharCode(0x1_f6_00)
      expect(typeof result).toBe('string')
    })
  })

  describe('camelToKebab', () => {
    it('should convert camelCase to kebab-case', () => {
      expect(camelToKebab('camelCase')).toBe('camel-case')
    })

    it('should convert PascalCase to kebab-case', () => {
      expect(camelToKebab('PascalCase')).toBe('pascal-case')
    })

    it('should handle single word', () => {
      expect(camelToKebab('word')).toBe('word')
    })

    it('should handle already kebab-case', () => {
      expect(camelToKebab('kebab-case')).toBe('kebab-case')
    })

    it('should handle multiple capitals', () => {
      expect(camelToKebab('XMLHttpRequest')).toContain('-')
    })

    it('should handle empty string', () => {
      expect(camelToKebab('')).toBe('')
    })

    it('should handle numbers', () => {
      expect(camelToKebab('test123Case')).toContain('case')
    })
  })

  describe('toKebabCase', () => {
    it('should convert camelCase to kebab-case', () => {
      expect(toKebabCase('camelCase')).toBe('camel-case')
    })

    it('should convert PascalCase to kebab-case', () => {
      expect(toKebabCase('PascalCase')).toBe('pascal-case')
    })

    it('should handle empty string', () => {
      expect(toKebabCase('')).toBe('')
    })

    it('should handle single word lowercase', () => {
      expect(toKebabCase('word')).toBe('word')
    })

    it('should handle single word uppercase', () => {
      expect(toKebabCase('WORD')).toBe('word')
    })

    it('should lowercase result', () => {
      expect(toKebabCase('UPPERCASE')).toBe('uppercase')
    })

    it('should handle multiple capital letters', () => {
      const result = toKebabCase('XMLHttpRequest')
      expect(result).toContain('-')
      expect(result.toLowerCase()).toBe(result)
    })
  })

  describe('isBlankString', () => {
    it('should return true for empty string', () => {
      expect(isBlankString('')).toBe(true)
    })

    it('should return true for whitespace only', () => {
      expect(isBlankString('   ')).toBe(true)
      expect(isBlankString('\t')).toBe(true)
      expect(isBlankString('\n')).toBe(true)
      expect(isBlankString('  \t\n  ')).toBe(true)
    })

    it('should return false for strings with content', () => {
      expect(isBlankString('text')).toBe(false)
      expect(isBlankString(' text ')).toBe(false)
    })

    it('should return false for non-string values', () => {
      expect(isBlankString(null)).toBe(false)
      expect(isBlankString(undefined)).toBe(false)
      expect(isBlankString(123)).toBe(false)
      expect(isBlankString({})).toBe(false)
    })
  })

  describe('isNonEmptyString', () => {
    it('should return true for strings with content', () => {
      expect(isNonEmptyString('text')).toBe(true)
      expect(isNonEmptyString(' ')).toBe(true)
    })

    it('should return false for empty string', () => {
      expect(isNonEmptyString('')).toBe(false)
    })

    it('should return false for non-string values', () => {
      expect(isNonEmptyString(null)).toBe(false)
      expect(isNonEmptyString(undefined)).toBe(false)
      expect(isNonEmptyString(123)).toBe(false)
    })
  })

  describe('stripBom', () => {
    it('should remove BOM from start of string', () => {
      const withBom = '\uFEFFtext'
      const result = stripBom(withBom)
      expect(result).toBe('text')
    })

    it('should not affect strings without BOM', () => {
      const result = stripBom('text')
      expect(result).toBe('text')
    })

    it('should only remove leading BOM', () => {
      const result = stripBom('text\uFEFF')
      expect(result).toBe('text\uFEFF')
    })

    it('should handle empty string', () => {
      const result = stripBom('')
      expect(result).toBe('')
    })

    it('should handle BOM only', () => {
      const result = stripBom('\uFEFF')
      expect(result).toBe('')
    })
  })

  describe('stripAnsi', () => {
    it('should remove ANSI escape codes', () => {
      const colored = '\u001b[31mred text\u001b[0m'
      const result = stripAnsi(colored)
      expect(result).toBe('red text')
    })

    it('should handle strings without ANSI codes', () => {
      const result = stripAnsi('plain text')
      expect(result).toBe('plain text')
    })

    it('should handle empty string', () => {
      const result = stripAnsi('')
      expect(result).toBe('')
    })

    it('should remove multiple ANSI codes', () => {
      const colored = '\u001b[31mred\u001b[0m \u001b[32mgreen\u001b[0m'
      const result = stripAnsi(colored)
      expect(result).toContain('red')
      expect(result).toContain('green')
    })
  })

  describe('trimNewlines', () => {
    it('should trim leading newlines', () => {
      const result = trimNewlines('\n\ntext')
      expect(result).toBe('text')
    })

    it('should trim trailing newlines', () => {
      const result = trimNewlines('text\n\n')
      expect(result).toBe('text')
    })

    it('should trim both leading and trailing newlines', () => {
      const result = trimNewlines('\n\ntext\n\n')
      expect(result).toBe('text')
    })

    it('should preserve internal newlines', () => {
      const result = trimNewlines('\nline1\nline2\n')
      expect(result).toContain('\n')
    })

    it('should handle string without newlines', () => {
      const result = trimNewlines('text')
      expect(result).toBe('text')
    })

    it('should handle empty string', () => {
      const result = trimNewlines('')
      expect(result).toBe('')
    })

    it('should handle only newlines', () => {
      const result = trimNewlines('\n\n\n')
      expect(result).toBe('')
    })
  })

  describe('indentString', () => {
    it('should indent string with default space', () => {
      const result = indentString('text')
      expect(result).toMatch(/^\s/)
      expect(result).toContain('text')
    })

    it('should indent with custom count', () => {
      const result = indentString('text', { count: 4 })
      expect(result).toMatch(/^\s+/)
      expect(result).toContain('text')
    })

    it('should indent with options', () => {
      const result = indentString('text', { count: 2 })
      expect(result).toMatch(/^\s+/)
      expect(result).toContain('text')
    })

    it('should indent multiple lines', () => {
      const result = indentString('line1\nline2', { count: 2 })
      const lines = result.split('\n')
      expect(lines[0]).toMatch(/^\s+/)
      expect(lines[1]).toMatch(/^\s+/)
    })

    it('should handle empty string', () => {
      const result = indentString('')
      expect(typeof result).toBe('string')
    })

    it('should handle includeEmptyLines option', () => {
      const result = indentString('line1\n\nline3', { count: 2 })
      expect(typeof result).toBe('string')
    })
  })

  describe('applyLinePrefix', () => {
    it('should add prefix to string', () => {
      const result = applyLinePrefix('text', { prefix: '> ' })
      expect(result).toContain('>')
      expect(result).toContain('text')
    })

    it('should add prefix to each line', () => {
      const result = applyLinePrefix('line1\nline2', { prefix: '> ' })
      const lines = result.split('\n')
      expect(lines[0]).toContain('>')
      expect(lines[1]).toContain('>')
    })

    it('should handle empty string', () => {
      const result = applyLinePrefix('', { prefix: '> ' })
      expect(typeof result).toBe('string')
    })

    it('should handle empty prefix', () => {
      const result = applyLinePrefix('text', { prefix: '' })
      expect(result).toBe('text')
    })

    it('should handle no options', () => {
      const result = applyLinePrefix('text')
      expect(result).toBe('text')
    })

    it('should handle multiple line breaks', () => {
      const result = applyLinePrefix('line1\n\nline3', { prefix: '> ' })
      expect(typeof result).toBe('string')
    })
  })

  describe('repeatString', () => {
    it('should repeat string n times', () => {
      const result = repeatString('x', 3)
      expect(result).toBe('xxx')
    })

    it('should handle count of 1', () => {
      const result = repeatString('test', 1)
      expect(result).toBe('test')
    })

    it('should handle count of 0', () => {
      const result = repeatString('test', 0)
      expect(result).toBe('')
    })

    it('should repeat multiple characters', () => {
      const result = repeatString('ab', 3)
      expect(result).toBe('ababab')
    })

    it('should handle empty string', () => {
      const result = repeatString('', 5)
      expect(result).toBe('')
    })

    it('should handle large counts', () => {
      const result = repeatString('x', 100)
      expect(result.length).toBe(100)
    })
  })

  describe('centerText', () => {
    it('should center text in width', () => {
      const result = centerText('text', 10)
      expect(result.length).toBe(10)
      expect(result).toContain('text')
    })

    it('should handle text wider than width', () => {
      const result = centerText('very long text', 5)
      expect(typeof result).toBe('string')
    })

    it('should handle exact width match', () => {
      const result = centerText('test', 4)
      expect(result).toBe('test')
    })

    it('should handle empty string', () => {
      const result = centerText('', 10)
      expect(result.length).toBeGreaterThanOrEqual(0)
    })

    it('should pad with spaces', () => {
      const result = centerText('x', 5)
      expect(result.length).toBe(5)
      expect(result).toContain('x')
    })
  })

  describe('stringWidth', () => {
    it('should calculate width of ASCII string', () => {
      const result = stringWidth('test')
      expect(result).toBe(4)
    })

    it('should handle empty string', () => {
      const result = stringWidth('')
      expect(result).toBe(0)
    })

    it('should handle ANSI codes', () => {
      const colored = '\u001b[31mtext\u001b[0m'
      const result = stringWidth(colored)
      expect(result).toBe(4)
    })

    it('should handle Unicode characters', () => {
      const result = stringWidth('こんにちは')
      expect(result).toBeGreaterThan(0)
    })

    it('should handle emoji', () => {
      const result = stringWidth('😀')
      expect(result).toBeGreaterThan(0)
    })

    it('should handle mixed content', () => {
      const result = stringWidth('test 😀')
      expect(result).toBeGreaterThan(5)
    })

    it('should handle tabs and newlines', () => {
      const result = stringWidth('test\ntest')
      expect(result).toBeGreaterThan(0)
    })
  })

  describe('search', () => {
    it('should find substring in string', () => {
      const result = search('hello world', /world/)
      expect(result).not.toBe(-1)
    })

    it('should return -1 when not found', () => {
      const result = search('hello world', /xyz/)
      expect(result).toBe(-1)
    })

    it('should handle case-sensitive search by default', () => {
      const result = search('Hello World', /world/)
      expect(result).toBe(-1)
    })

    it('should handle empty string', () => {
      const result = search('', /test/)
      expect(result).toBe(-1)
    })

    it('should handle empty search term', () => {
      const result = search('test', /(?:)/)
      expect(typeof result).toBe('number')
    })

    it('should find substring at start', () => {
      const result = search('hello world', /hello/)
      expect(result).toBe(0)
    })

    it('should find substring at end', () => {
      const result = search('hello world', /world/)
      expect(result).toBeGreaterThan(0)
    })
  })

  describe('edge cases', () => {
    it('should handle very long strings', () => {
      const longString = 'a'.repeat(10_000)
      expect(stripAnsi(longString)).toBe(longString)
    })

    it('should handle special characters in kebab conversion', () => {
      expect(toKebabCase('hello@world')).toContain('hello')
    })

    it('should handle mixed whitespace', () => {
      expect(isBlankString('  \t\n\r  ')).toBe(true)
    })

    it('should handle Unicode in width calculation', () => {
      const result = stringWidth('test 世界')
      expect(result).toBeGreaterThan(4)
    })

    it('should handle nested ANSI codes', () => {
      const colored = '\u001b[31m\u001b[1mtext\u001b[0m\u001b[0m'
      const result = stripAnsi(colored)
      expect(result).toBe('text')
    })

    it('should handle multiline indentation', () => {
      const result = indentString('line1\nline2\nline3', { count: 4 })
      const lines = result.split('\n')
      expect(lines.length).toBe(3)
    })

    it('should handle prefix with special chars', () => {
      const result = applyLinePrefix('text', { prefix: '>> ' })
      expect(result).toContain('>>')
    })

    it('should handle zero-width repeat', () => {
      const result = repeatString('test', 0)
      expect(result).toBe('')
    })

    it('should handle negative width in center', () => {
      const result = centerText('test', -1)
      expect(typeof result).toBe('string')
    })

    it('should handle null bytes', () => {
      const result = stripBom('\x00text')
      expect(result).toContain('text')
    })
  })
})
