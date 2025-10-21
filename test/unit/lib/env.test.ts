/**
 * @fileoverview Tests for environment variable utilities.
 *
 * Validates envAsBoolean, envAsNumber, and envAsString conversion functions.
 */

import { envAsBoolean, envAsNumber, envAsString } from '@socketsecurity/lib/env'
import { describe, expect, it } from 'vitest'

describe('env utilities', () => {
  describe('envAsBoolean', () => {
    it('should return true for string "1"', () => {
      expect(envAsBoolean('1')).toBe(true)
    })

    it('should return true for string "true" (case-insensitive)', () => {
      expect(envAsBoolean('true')).toBe(true)
      expect(envAsBoolean('True')).toBe(true)
      expect(envAsBoolean('TRUE')).toBe(true)
    })

    it('should return false for string "0"', () => {
      expect(envAsBoolean('0')).toBe(false)
    })

    it('should return false for string "false"', () => {
      expect(envAsBoolean('false')).toBe(false)
    })

    it('should return false for empty string', () => {
      expect(envAsBoolean('')).toBe(false)
    })

    it('should trim whitespace before checking', () => {
      expect(envAsBoolean('  1  ')).toBe(true)
      expect(envAsBoolean('  true  ')).toBe(true)
      expect(envAsBoolean('  false  ')).toBe(false)
    })

    it('should return default value for null', () => {
      expect(envAsBoolean(null)).toBe(false)
      expect(envAsBoolean(null, true)).toBe(true)
    })

    it('should return default value for undefined', () => {
      expect(envAsBoolean(undefined)).toBe(false)
      expect(envAsBoolean(undefined, true)).toBe(true)
    })

    it('should coerce non-string values to boolean', () => {
      expect(envAsBoolean(1)).toBe(true)
      expect(envAsBoolean(0)).toBe(false)
      expect(envAsBoolean({})).toBe(true)
      expect(envAsBoolean([])).toBe(true)
    })

    it('should handle random strings as falsy', () => {
      expect(envAsBoolean('yes')).toBe(false)
      expect(envAsBoolean('no')).toBe(false)
      expect(envAsBoolean('random')).toBe(false)
    })

    it('should default to false when no default provided', () => {
      expect(envAsBoolean(null)).toBe(false)
    })

    it('should respect custom default value', () => {
      expect(envAsBoolean(undefined, true)).toBe(true)
      expect(envAsBoolean(null, true)).toBe(true)
    })
  })

  describe('envAsNumber', () => {
    it('should parse valid integer strings', () => {
      expect(envAsNumber('42')).toBe(42)
      expect(envAsNumber('0')).toBe(0)
      expect(envAsNumber('-123')).toBe(-123)
    })

    it('should parse strings with whitespace', () => {
      expect(envAsNumber('  42  ')).toBe(42)
    })

    it('should truncate decimal values', () => {
      expect(envAsNumber('3.14')).toBe(3)
      expect(envAsNumber('99.99')).toBe(99)
    })

    it('should return default for non-numeric strings', () => {
      expect(envAsNumber('not a number')).toBe(0)
      expect(envAsNumber('not a number', 10)).toBe(10)
    })

    it('should return default for null', () => {
      expect(envAsNumber(null)).toBe(0)
      expect(envAsNumber(null, 5)).toBe(5)
    })

    it('should return default for undefined', () => {
      expect(envAsNumber(undefined)).toBe(0)
      expect(envAsNumber(undefined, 5)).toBe(5)
    })

    it('should handle negative zero as zero', () => {
      expect(envAsNumber(-0)).toBe(0)
      expect(Object.is(envAsNumber(-0), 0)).toBe(true)
    })

    it('should handle numeric values directly', () => {
      expect(envAsNumber(42)).toBe(42)
      expect(envAsNumber(0)).toBe(0)
    })

    it('should default to 0 when no default provided', () => {
      expect(envAsNumber('invalid')).toBe(0)
    })

    it('should handle empty string with default', () => {
      expect(envAsNumber('')).toBe(0)
      expect(envAsNumber('', 10)).toBe(10)
    })

    it('should handle hexadecimal-like strings in base 10', () => {
      // Treated as base 10, only '0' is parsed.
      expect(envAsNumber('0x10')).toBe(0)
    })

    it('should handle leading zeros', () => {
      expect(envAsNumber('007')).toBe(7)
      expect(envAsNumber('0042')).toBe(42)
    })

    it('should handle large numbers', () => {
      expect(envAsNumber('999999')).toBe(999_999)
    })
  })

  describe('envAsString', () => {
    it('should return trimmed string', () => {
      expect(envAsString('  hello  ')).toBe('hello')
    })

    it('should handle string values directly', () => {
      expect(envAsString('test')).toBe('test')
    })

    it('should return default for null', () => {
      expect(envAsString(null)).toBe('')
      expect(envAsString(null, 'default')).toBe('default')
    })

    it('should return default for undefined', () => {
      expect(envAsString(undefined)).toBe('')
      expect(envAsString(undefined, 'default')).toBe('default')
    })

    it('should convert numbers to strings', () => {
      expect(envAsString(42)).toBe('42')
      expect(envAsString(0)).toBe('0')
      expect(envAsString(-123)).toBe('-123')
    })

    it('should convert booleans to strings', () => {
      expect(envAsString(true)).toBe('true')
      expect(envAsString(false)).toBe('false')
    })

    it('should convert objects to strings', () => {
      expect(envAsString({})).toBe('[object Object]')
      expect(envAsString([])).toBe('')
    })

    it('should default to empty string when no default provided', () => {
      expect(envAsString(null)).toBe('')
    })

    it('should handle empty string input', () => {
      expect(envAsString('')).toBe('')
    })

    it('should trim whitespace from default value', () => {
      expect(envAsString(null, '  default  ')).toBe('default')
    })

    it('should handle multiline strings with trimming', () => {
      expect(envAsString('  line1\nline2  ')).toBe('line1\nline2')
    })

    it('should handle special characters', () => {
      expect(envAsString('$PATH')).toBe('$PATH')
      expect(envAsString('/usr/bin')).toBe('/usr/bin')
    })

    it('should handle Unicode characters', () => {
      expect(envAsString('hello 世界')).toBe('hello 世界')
    })
  })

  describe('edge cases', () => {
    it('should handle envAsBoolean with truthy non-string values', () => {
      expect(envAsBoolean({ key: 'value' })).toBe(true)
      expect(envAsBoolean([1, 2, 3])).toBe(true)
    })

    it('should handle envAsNumber with Infinity', () => {
      expect(envAsNumber(Number.POSITIVE_INFINITY, 10)).toBe(10)
      expect(envAsNumber(Number.NEGATIVE_INFINITY, 10)).toBe(10)
    })

    it('should handle envAsNumber with NaN', () => {
      expect(envAsNumber(Number.NaN, 10)).toBe(10)
    })

    it('should handle envAsString with Symbol', () => {
      const sym = Symbol('test')
      expect(envAsString(sym)).toBe('Symbol(test)')
    })
  })
})
