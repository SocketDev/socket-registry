import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  envAsBoolean,
  envAsNumber,
  envAsString,
} from '../../registry/dist/lib/env.js'

describe('env module', () => {
  let originalEnv: NodeJS.ProcessEnv

  beforeEach(() => {
    originalEnv = { ...process.env }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('envAsString', () => {
    it('should return environment variable as string', () => {
      expect(envAsString('test value')).toBe('test value')
      expect(envAsString('  spaced  ')).toBe('spaced')
    })

    it('should return default value for missing variable', () => {
      expect(envAsString(undefined, 'default')).toBe('default')
      expect(envAsString(null, 'default')).toBe('default')
    })

    it('should return empty string for missing variable without default', () => {
      expect(envAsString(undefined)).toBe('')
      expect(envAsString(null)).toBe('')
    })

    it('should trim whitespace', () => {
      expect(envAsString('  spaced  ')).toBe('spaced')
      expect(envAsString('\t\ntrimmed\t\n')).toBe('trimmed')
    })

    it('should handle empty string values', () => {
      expect(envAsString('')).toBe('')
      expect(envAsString('   ')).toBe('')
    })

    it('should convert non-string values', () => {
      expect(envAsString(123)).toBe('123')
      expect(envAsString(true)).toBe('true')
      expect(envAsString(false)).toBe('false')
    })
  })

  describe('envAsNumber', () => {
    it('should return environment variable as number', () => {
      expect(envAsNumber('42')).toBe(42)
      expect(envAsNumber('100')).toBe(100)
    })

    it('should return default value for missing variable', () => {
      expect(envAsNumber(undefined, 10)).toBe(10)
      expect(envAsNumber(null, 20)).toBe(20)
    })

    it('should return 0 for missing variable without default', () => {
      expect(envAsNumber(undefined)).toBe(0)
      expect(envAsNumber(null)).toBe(0)
    })

    it('should handle decimal numbers', () => {
      // parseInt only gets integer part
      expect(envAsNumber('3.14')).toBe(3)
      expect(envAsNumber('5.99')).toBe(5)
    })

    it('should handle negative numbers', () => {
      expect(envAsNumber('-42')).toBe(-42)
      expect(envAsNumber('-100')).toBe(-100)
    })

    it('should return default for invalid numbers', () => {
      expect(envAsNumber('not a number')).toBe(0)
      expect(envAsNumber('abc', 5)).toBe(5)
    })

    it('should handle scientific notation', () => {
      // parseInt stops at decimal
      expect(envAsNumber('1.23e4')).toBe(1)
      expect(envAsNumber('1e3')).toBe(1)
    })

    it('should handle strings with numbers', () => {
      // parseInt extracts number
      expect(envAsNumber('42px')).toBe(42)
      expect(envAsNumber('  42  ')).toBe(42)
    })
  })

  describe('envAsBoolean', () => {
    it('should return true for truthy values', () => {
      expect(envAsBoolean('true')).toBe(true)
      expect(envAsBoolean('TRUE')).toBe(true)
      expect(envAsBoolean('1')).toBe(true)
      // trimmed
      expect(envAsBoolean(' 1 ')).toBe(true)
    })

    it('should return false for falsy values', () => {
      expect(envAsBoolean('false')).toBe(false)
      expect(envAsBoolean('0')).toBe(false)
      // any string != '1' or 'true' is false
      expect(envAsBoolean('no')).toBe(false)
      expect(envAsBoolean('off')).toBe(false)
    })

    it('should return default value for missing variable', () => {
      expect(envAsBoolean(undefined, true)).toBe(true)
      expect(envAsBoolean(null, true)).toBe(true)
      expect(envAsBoolean(undefined, false)).toBe(false)
      expect(envAsBoolean(null, false)).toBe(false)
    })

    it('should return false for missing variable without default', () => {
      expect(envAsBoolean(undefined)).toBe(false)
      expect(envAsBoolean(null)).toBe(false)
    })

    it('should handle case insensitive values', () => {
      expect(envAsBoolean('TRUE')).toBe(true)
      expect(envAsBoolean('True')).toBe(true)
      // not 'true' or '1'
      expect(envAsBoolean('False')).toBe(false)
    })

    it('should handle empty string as false', () => {
      expect(envAsBoolean('')).toBe(false)
      // trimmed to empty
      expect(envAsBoolean('   ')).toBe(false)
    })

    it('should handle any non-true/1 string as false', () => {
      // not 'true' or '1'
      expect(envAsBoolean('anything')).toBe(false)
      expect(envAsBoolean('yes')).toBe(false)
      expect(envAsBoolean('on')).toBe(false)
    })

    it('should handle non-string, non-null values', () => {
      expect(envAsBoolean(1)).toBe(true)
      expect(envAsBoolean(0)).toBe(false)
      expect(envAsBoolean({})).toBe(true)
      expect(envAsBoolean([])).toBe(true)
    })
  })

  describe('envAsNumber edge cases', () => {
    it('should handle negative zero correctly', () => {
      // JavaScript -0 edge case
      const result = envAsNumber('-0')
      expect(result).toBe(0)
      expect(Object.is(result, 0)).toBe(true)
      expect(Object.is(result, -0)).toBe(false)
    })

    it('should handle zero with plus sign', () => {
      expect(envAsNumber('+0')).toBe(0)
      expect(envAsNumber('0')).toBe(0)
    })

    it('should handle leading zeros', () => {
      expect(envAsNumber('007')).toBe(7)
      expect(envAsNumber('00042')).toBe(42)
    })

    it('should handle hex notation', () => {
      // parseInt handles hex
      expect(envAsNumber('0x10')).toBe(0)
      expect(envAsNumber('0xFF')).toBe(0)
    })

    it('should handle binary notation', () => {
      // parseInt in base 10 stops at b
      expect(envAsNumber('0b1010')).toBe(0)
    })

    it('should handle numbers with leading whitespace', () => {
      expect(envAsNumber('  42  ')).toBe(42)
      expect(envAsNumber('\t100\n')).toBe(100)
    })

    it('should return 0 for Infinity strings', () => {
      expect(envAsNumber('Infinity', 5)).toBe(5)
      expect(envAsNumber('-Infinity', 10)).toBe(10)
    })

    it('should handle boolean values', () => {
      expect(envAsNumber(true)).toBe(0)
      expect(envAsNumber(false)).toBe(0)
    })

    it('should handle object values', () => {
      expect(envAsNumber({})).toBe(0)
      expect(envAsNumber([], 5)).toBe(5)
    })
  })

  describe('envAsString edge cases', () => {
    it('should trim default value when not empty string', () => {
      expect(envAsString(undefined, '  default  ')).toBe('default')
      expect(envAsString(null, '\tdefault\n')).toBe('default')
    })

    it('should keep empty string default as-is', () => {
      expect(envAsString(undefined, '')).toBe('')
      expect(envAsString(null, '')).toBe('')
    })

    it('should handle objects as strings', () => {
      expect(envAsString({})).toBe('[object Object]')
      expect(envAsString([])).toBe('')
      expect(envAsString([1, 2, 3])).toBe('1,2,3')
    })

    it('should handle special number values', () => {
      expect(envAsString(Number.NaN)).toBe('NaN')
      expect(envAsString(Number.POSITIVE_INFINITY)).toBe('Infinity')
      expect(envAsString(Number.NEGATIVE_INFINITY)).toBe('-Infinity')
    })

    it('should handle zero values', () => {
      expect(envAsString(0)).toBe('0')
      expect(envAsString(-0)).toBe('0')
    })
  })

  describe('envAsBoolean edge cases', () => {
    it('should handle mixed case with whitespace', () => {
      expect(envAsBoolean('  TrUe  ')).toBe(true)
      expect(envAsBoolean('\t1\n')).toBe(true)
    })

    it('should treat truthy default correctly', () => {
      expect(envAsBoolean(undefined, 1 as any)).toBe(true)
      expect(envAsBoolean(null, 'yes' as any)).toBe(true)
    })

    it('should treat falsy default correctly', () => {
      expect(envAsBoolean(undefined, 0 as any)).toBe(false)
      expect(envAsBoolean(null, '' as any)).toBe(false)
    })

    it('should handle symbol values', () => {
      const sym = Symbol('test')
      expect(envAsBoolean(sym)).toBe(true)
    })

    it('should handle function values', () => {
      expect(envAsBoolean(() => {})).toBe(true)
      expect(envAsBoolean(() => {})).toBe(true)
    })
  })
})
