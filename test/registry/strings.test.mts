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
    })

    it('should return false for non-strings', () => {
      expect(isBlankString(null)).toBe(false)
      expect(isBlankString(undefined)).toBe(false)
      expect(isBlankString(0)).toBe(false)
    })
  })

  describe('camelToKebab', () => {
    it('should convert camelCase to kebab-case', () => {
      expect(camelToKebab('camelCase')).toBe('camel-case')
      expect(camelToKebab('myVariableName')).toBe('my-variable-name')
      expect(camelToKebab('someHTMLElement')).toBe('some-htmlelement')
    })

    it('should handle PascalCase', () => {
      expect(camelToKebab('PascalCase')).toBe('pascal-case')
      expect(camelToKebab('MyClassName')).toBe('my-class-name')
    })

    it('should handle already kebab-case', () => {
      expect(camelToKebab('already-kebab')).toBe('already-kebab')
    })

    it('should handle single words', () => {
      expect(camelToKebab('word')).toBe('word')
      expect(camelToKebab('Word')).toBe('word')
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
    })

    it('should handle strings without ANSI codes', () => {
      expect(stripAnsi('Plain text')).toBe('Plain text')
      expect(stripAnsi('')).toBe('')
    })

    it('should handle multiple ANSI codes', () => {
      expect(stripAnsi('\u001b[31mRed\u001b[0m \u001b[32mGreen\u001b[0m')).toBe(
        'Red Green',
      )
    })

    it('should handle complex ANSI sequences', () => {
      expect(stripAnsi('\u001b[1;31mBold Red\u001b[0m')).toBe('Bold Red')
      expect(stripAnsi('\u001b[38;5;196mExtended Color\u001b[0m')).toBe(
        'Extended Color',
      )
    })
  })

  describe('stripBom', () => {
    it('should remove UTF-8 BOM', () => {
      expect(stripBom('\uFEFFHello')).toBe('Hello')
      expect(stripBom('\uFEFF')).toBe('')
    })

    it('should not modify strings without BOM', () => {
      expect(stripBom('Hello')).toBe('Hello')
      expect(stripBom('')).toBe('')
    })

    it('should only remove BOM from start', () => {
      expect(stripBom('Hello\uFEFFWorld')).toBe('Hello\uFEFFWorld')
    })
  })

  describe('indentString', () => {
    it('should indent lines with specified string', () => {
      expect(indentString('line1\nline2', 2)).toBe('  line1\n  line2')
      expect(indentString('single', 2)).toBe('  single')
    })

    it('should handle custom indent strings', () => {
      expect(indentString('line1\nline2', 3)).toBe('   line1\n   line2')
      expect(indentString('line1\nline2', 1)).toBe(' line1\n line2')
    })

    it('should handle empty lines', () => {
      expect(indentString('line1\n\nline3', 2)).toBe('  line1\n\n  line3')
    })

    it('should handle empty strings', () => {
      expect(indentString('', 2)).toBe('')
    })
  })

  describe('applyLinePrefix', () => {
    it('should apply prefix to each line', () => {
      expect(applyLinePrefix('line1\nline2', '> ')).toBe('> line1\n> line2')
      expect(applyLinePrefix('single', '# ')).toBe('# single')
    })

    it('should handle empty lines', () => {
      expect(applyLinePrefix('line1\n\nline3', '> ')).toBe(
        '> line1\n> \n> line3',
      )
    })

    it('should handle empty strings', () => {
      expect(applyLinePrefix('', '> ')).toBe('> ')
    })
  })

  describe('trimNewlines', () => {
    it('should trim leading and trailing newlines', () => {
      expect(trimNewlines('\n\nhello\n\n')).toBe('hello')
      expect(trimNewlines('\r\nhello\r\n')).toBe('hello')
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
    })

    it('should support regex patterns', () => {
      expect(search('hello123world', /\d+/)).toBe(5)
    })

    it('should handle case-insensitive search', () => {
      expect(search('Hello World', /world/i)).toBe(6)
    })

    it('should handle empty strings', () => {
      expect(search('', /test/)).toBe(-1)
      // Empty pattern matches at start.
      expect(search('test', /^/)).toBe(0)
    })
  })
})
