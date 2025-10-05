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

describe('strings module', () => {
  describe('isNonEmptyString', () => {
    it('should return true for non-empty strings', () => {
      expect(isNonEmptyString('hello')).toBe(true)
      expect(isNonEmptyString(' ')).toBe(true)
      expect(isNonEmptyString('  test  ')).toBe(true)
      expect(isNonEmptyString('a')).toBe(true)
    })

    it('should return false for empty strings', () => {
      expect(isNonEmptyString('')).toBe(false)
    })

    it('should return false for non-strings', () => {
      expect(isNonEmptyString(null)).toBe(false)
      expect(isNonEmptyString(undefined)).toBe(false)
      expect(isNonEmptyString(123)).toBe(false)
      expect(isNonEmptyString([])).toBe(false)
    })
  })

  describe('isBlankString', () => {
    it('should return true for blank strings', () => {
      expect(isBlankString('')).toBe(true)
      expect(isBlankString(' ')).toBe(true)
      expect(isBlankString('   ')).toBe(true)
      expect(isBlankString('\t')).toBe(true)
      expect(isBlankString('\n')).toBe(true)
      expect(isBlankString(' \t\n ')).toBe(true)
    })

    it('should return false for non-blank strings', () => {
      expect(isBlankString('a')).toBe(false)
      expect(isBlankString(' a ')).toBe(false)
      expect(isBlankString('hello')).toBe(false)
      expect(isBlankString(' hello ')).toBe(false)
    })

    it('should return false for non-strings', () => {
      expect(isBlankString(null)).toBe(false)
      expect(isBlankString(undefined)).toBe(false)
      expect(isBlankString(0)).toBe(false)
      expect(isBlankString(123)).toBe(false)
    })
  })

  describe('camelToKebab', () => {
    it('should convert camelCase to kebab-case', () => {
      expect(camelToKebab('camelCase')).toBe('camel-case')
      expect(camelToKebab('myVariableName')).toBe('my-variable-name')
      expect(camelToKebab('someHTMLElement')).toBe('some-htmlelement')
      expect(camelToKebab('helloWorld')).toBe('hello-world')
      expect(camelToKebab('simpleCase')).toBe('simple-case')
    })

    it('should handle PascalCase', () => {
      expect(camelToKebab('PascalCase')).toBe('pascal-case')
      expect(camelToKebab('MyClassName')).toBe('my-class-name')
    })

    it('should handle already kebab-case', () => {
      expect(camelToKebab('already-kebab')).toBe('already-kebab')
      expect(camelToKebab('hello-world')).toBe('hello-world')
    })

    it('should handle single words', () => {
      expect(camelToKebab('word')).toBe('word')
      expect(camelToKebab('Word')).toBe('word')
      expect(camelToKebab('hello')).toBe('hello')
    })

    it('should handle multiple capitals', () => {
      expect(camelToKebab('XMLHttpRequest')).toBe('xmlhttp-request')
    })

    it('should handle empty strings', () => {
      expect(camelToKebab('')).toBe('')
    })
  })

  describe('toKebabCase', () => {
    it('should convert various formats to kebab-case', () => {
      expect(toKebabCase('HelloWorld')).toBe('hello-world')
      expect(toKebabCase('hello_world')).toBe('hello-world')
      // Spaces not converted.
      expect(toKebabCase('hello world')).toBe('hello world')
      // Spaces preserved, just lowercase.
      expect(toKebabCase('Hello World')).toBe('hello world')
      expect(toKebabCase('helloWorld')).toBe('hello-world')
    })

    it('should handle camelCase', () => {
      expect(toKebabCase('helloWorld')).toBe('hello-world')
      expect(toKebabCase('camelCase')).toBe('camel-case')
    })

    it('should handle PascalCase', () => {
      expect(toKebabCase('HelloWorld')).toBe('hello-world')
      expect(toKebabCase('PascalCase')).toBe('pascal-case')
    })

    it('should handle snake_case', () => {
      expect(toKebabCase('hello_world')).toBe('hello-world')
      expect(toKebabCase('snake_case')).toBe('snake-case')
    })

    it('should handle multiple spaces and underscores', () => {
      // Spaces preserved.
      expect(toKebabCase('hello  world')).toBe('hello  world')
      // Each _ becomes -.
      expect(toKebabCase('hello__world')).toBe('hello--world')
    })

    it('should handle mixed separators', () => {
      // Only _ converted.
      expect(toKebabCase('hello_world test')).toBe('hello-world test')
      expect(toKebabCase('hello-world_test')).toBe('hello-world-test')
    })

    it('should handle already kebab-case', () => {
      expect(toKebabCase('hello-world')).toBe('hello-world')
    })

    it('should handle numbers in camelCase', () => {
      expect(toKebabCase('hello2World')).toBe('hello2-world')
    })

    it('should handle empty strings', () => {
      expect(toKebabCase('')).toBe('')
    })
  })

  describe('stripAnsi', () => {
    it('should remove ANSI escape codes', () => {
      expect(stripAnsi('\u001b[31mRed Text\u001b[0m')).toBe('Red Text')
      expect(stripAnsi('\u001b[1m\u001b[32mBold Green\u001b[0m')).toBe(
        'Bold Green',
      )
      expect(stripAnsi('\u001B[31mhello\u001B[0m')).toBe('hello')
    })

    it('should handle strings without ANSI codes', () => {
      expect(stripAnsi('Plain text')).toBe('Plain text')
      expect(stripAnsi('')).toBe('')
      expect(stripAnsi('hello world')).toBe('hello world')
      expect(stripAnsi('normal text')).toBe('normal text')
    })

    it('should handle multiple ANSI codes', () => {
      expect(stripAnsi('\u001b[31mRed\u001b[0m \u001b[32mGreen\u001b[0m')).toBe(
        'Red Green',
      )
      expect(stripAnsi('\u001B[31m\u001B[1mhello\u001B[0m')).toBe('hello')
    })

    it('should handle complex ANSI sequences', () => {
      expect(stripAnsi('\u001b[1;31mBold Red\u001b[0m')).toBe('Bold Red')
      expect(stripAnsi('\u001b[38;5;196mExtended Color\u001b[0m')).toBe(
        'Extended Color',
      )
      expect(stripAnsi('\u001b[31mred text\u001b[39m')).toBe('red text')
    })
  })

  describe('stripBom', () => {
    it('should remove UTF-8 BOM', () => {
      expect(stripBom('\uFEFFHello')).toBe('Hello')
      expect(stripBom('\uFEFF')).toBe('')
      expect(stripBom('\uFEFFhello')).toBe('hello')
    })

    it('should not modify strings without BOM', () => {
      expect(stripBom('Hello')).toBe('Hello')
      expect(stripBom('')).toBe('')
      expect(stripBom('hello')).toBe('hello')
    })

    it('should only remove BOM from start', () => {
      expect(stripBom('Hello\uFEFFWorld')).toBe('Hello\uFEFFWorld')
      expect(stripBom('hello\uFEFFworld')).toBe('hello\uFEFFworld')
    })
  })

  describe('indentString', () => {
    it('should indent lines with specified string', () => {
      expect(indentString('line1\nline2', { count: 2 })).toBe(
        '  line1\n  line2',
      )
      expect(indentString('single', { count: 2 })).toBe('  single')
      expect(indentString('hello\nworld', { count: 2 })).toBe(
        '  hello\n  world',
      )
    })

    it('should handle custom indent strings', () => {
      expect(indentString('line1\nline2', { count: 3 })).toBe(
        '   line1\n   line2',
      )
      expect(indentString('line1\nline2', { count: 1 })).toBe(' line1\n line2')
      expect(indentString('hello\nworld', { count: 1 })).toBe(' hello\n world')
    })

    it('should handle single line', () => {
      expect(indentString('hello', { count: 4 })).toBe('    hello')
    })

    it('should indent string by default amount', () => {
      const result = indentString('hello')
      expect(result).toBe(' hello')
    })

    it('should handle multiple lines', () => {
      const result = indentString('hello\nworld', { count: 1 })
      expect(result).toBe(' hello\n world')
    })

    it('should handle zero indent', () => {
      const result = indentString('hello', { count: 0 })
      expect(result).toBe('hello')
    })

    it('should handle empty lines', () => {
      expect(indentString('line1\n\nline3', { count: 2 })).toBe(
        '  line1\n\n  line3',
      )
    })

    it('should handle empty strings', () => {
      expect(indentString('', { count: 2 })).toBe('')
    })
  })

  describe('applyLinePrefix', () => {
    it('should apply prefix to each line', () => {
      expect(applyLinePrefix('line1\nline2', { prefix: '> ' })).toBe(
        '> line1\n> line2',
      )
      expect(applyLinePrefix('single', { prefix: '# ' })).toBe('# single')
      expect(applyLinePrefix('hello\nworld', { prefix: '> ' })).toBe(
        '> hello\n> world',
      )
      expect(applyLinePrefix('single line', { prefix: '# ' })).toBe(
        '# single line',
      )
    })

    it('should apply prefix to single line', () => {
      const result = applyLinePrefix('hello', { prefix: '> ' })
      expect(result).toBe('> hello')
      expect(applyLinePrefix('test', { prefix: '- ' })).toBe('- test')
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

    it('should handle empty lines', () => {
      expect(applyLinePrefix('line1\n\nline3', { prefix: '> ' })).toBe(
        '> line1\n> \n> line3',
      )
    })

    it('should handle empty strings', () => {
      expect(applyLinePrefix('', { prefix: '> ' })).toBe('> ')
    })
  })

  describe('trimNewlines', () => {
    it('should trim leading and trailing newlines', () => {
      expect(trimNewlines('\n\nhello\n\n')).toBe('hello')
      expect(trimNewlines('\r\nhello\r\n')).toBe('hello')
    })

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

    it('should handle strings without newlines', () => {
      expect(trimNewlines('hello')).toBe('hello')
    })

    it('should handle empty strings', () => {
      expect(trimNewlines('')).toBe('')
    })

    it('should handle only newlines', () => {
      expect(trimNewlines('\n\n\n')).toBe('')
      expect(trimNewlines('\r\n')).toBe('')
    })

    it('should handle single newline character', () => {
      expect(trimNewlines('\n')).toBe('')
      expect(trimNewlines('\r')).toBe('')
    })

    it('should handle single non-newline character', () => {
      expect(trimNewlines('a')).toBe('a')
      expect(trimNewlines('1')).toBe('1')
    })
  })

  describe('search', () => {
    it('should search for pattern in string', () => {
      expect(search('hello world', /world/)).toBe(6)
      expect(search('hello world', /o/)).toBe(4)
    })

    it('should return -1 for no match', () => {
      expect(search('hello world', /xyz/)).toBe(-1)
      expect(search('hello', /world/)).toBe(-1)
    })

    it('should support regex patterns', () => {
      expect(search('hello123world', /\d+/)).toBe(5)
      expect(search('hello123', /\d+/)).toBeGreaterThan(-1)
    })

    it('should handle case-insensitive search', () => {
      expect(search('Hello World', /world/i)).toBe(6)
      expect(search('Hello World', /world/i)).toBeGreaterThan(-1)
    })

    it('should handle empty strings', () => {
      expect(search('', /test/)).toBe(-1)
      // Empty pattern matches at start.
      expect(search('test', /^/)).toBe(0)
    })

    it('should find pattern in text', () => {
      const result = search('hello world', /world/)
      expect(result).toBeGreaterThan(-1)
    })

    it('should handle fromIndex parameter', () => {
      const result = search('hello world world', /world/, { fromIndex: 10 })
      expect(result).toBeGreaterThan(10)
    })

    it('should handle negative fromIndex', () => {
      const result = search('hello world', /world/, { fromIndex: -5 })
      expect(result).toBeGreaterThan(-1)
    })

    it('should search strings with string patterns', () => {
      // @ts-expect-error - Testing runtime behavior with string patterns.
      expect(search('hello world', 'world')).toBe(6)
      // @ts-expect-error - Testing runtime behavior with string patterns.
      expect(search('test string', 'missing')).toBe(-1)
    })
  })
})
