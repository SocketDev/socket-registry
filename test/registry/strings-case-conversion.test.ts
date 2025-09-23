import { describe, expect, it } from 'vitest'

const {
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
} = require('@socketsecurity/registry/lib/strings')

describe('strings case conversion and manipulation', () => {
  describe('applyLinePrefix', () => {
    it('should add prefix to each line', () => {
      expect(applyLinePrefix('hello\nworld', '> ')).toBe('> hello\n> world')
      expect(applyLinePrefix('single line', '# ')).toBe('# single line')
    })

    it('should handle single line', () => {
      expect(applyLinePrefix('test', '- ')).toBe('- test')
    })

    it('should handle empty string', () => {
      expect(applyLinePrefix('', '> ')).toBe('> ')
    })
  })

  describe('case conversion', () => {
    it('should convert to kebab-case', () => {
      expect(toKebabCase('camelCase')).toBe('camel-case')
      expect(toKebabCase('PascalCase')).toBe('pascal-case')
      expect(toKebabCase('snake_case')).toBe('snake-case')
    })

    it('should convert camelCase to kebab', () => {
      expect(camelToKebab('camelCase')).toBe('camel-case')
      expect(camelToKebab('simpleCase')).toBe('simple-case')
    })
  })

  describe('string validation', () => {
    it('should check if string is blank', () => {
      expect(isBlankString('')).toBe(true)
      expect(isBlankString('   ')).toBe(true)
      expect(isBlankString('hello')).toBe(false)
      expect(isBlankString(null)).toBe(false)
      expect(isBlankString(undefined)).toBe(false)
    })

    it('should check if string is non-empty', () => {
      expect(isNonEmptyString('hello')).toBe(true)
      expect(isNonEmptyString('')).toBe(false)
      expect(isNonEmptyString('   ')).toBe(true)
      expect(isNonEmptyString(null)).toBe(false)
      expect(isNonEmptyString(undefined)).toBe(false)
    })
  })

  describe('string manipulation', () => {
    it('should indent strings', () => {
      const text = 'hello\nworld'
      expect(indentString(text, 2)).toBe('  hello\n  world')
      expect(indentString('single', 4)).toBe('    single')
    })

    it('should search strings', () => {
      expect(search('hello world', 'world')).toBe(6)
      expect(search('test string', 'missing')).toBe(-1)
    })

    it('should strip ANSI codes', () => {
      expect(stripAnsi('\u001b[31mred text\u001b[39m')).toBe('red text')
      expect(stripAnsi('normal text')).toBe('normal text')
    })

    it('should strip BOM', () => {
      expect(stripBom('\uFEFFhello')).toBe('hello')
      expect(stripBom('hello')).toBe('hello')
    })

    it('should trim newlines', () => {
      expect(trimNewlines('\nhello\n')).toBe('hello')
      expect(trimNewlines('hello\n\n')).toBe('hello')
      expect(trimNewlines('\n\nhello\n\n')).toBe('hello')
    })
  })
})
