import { afterEach, beforeEach, describe, expect, it } from 'vitest'

const {
  envAsBoolean,
  envAsNumber,
  envAsString,
} = require('@socketsecurity/registry/lib/env')

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
      expect(envAsNumber('3.14')).toBe(3) // parseInt only gets integer part
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
      expect(envAsNumber('1.23e4')).toBe(1) // parseInt stops at decimal
      expect(envAsNumber('1e3')).toBe(1)
    })

    it('should handle strings with numbers', () => {
      expect(envAsNumber('42px')).toBe(42) // parseInt extracts number
      expect(envAsNumber('  42  ')).toBe(42)
    })
  })

  describe('envAsBoolean', () => {
    it('should return true for truthy values', () => {
      expect(envAsBoolean('true')).toBe(true)
      expect(envAsBoolean('TRUE')).toBe(true)
      expect(envAsBoolean('1')).toBe(true)
      expect(envAsBoolean(' 1 ')).toBe(true) // trimmed
    })

    it('should return false for falsy values', () => {
      expect(envAsBoolean('false')).toBe(false)
      expect(envAsBoolean('0')).toBe(false)
      expect(envAsBoolean('no')).toBe(false) // any string != '1' or 'true' is false
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
      expect(envAsBoolean('False')).toBe(false) // not 'true' or '1'
    })

    it('should handle empty string as false', () => {
      expect(envAsBoolean('')).toBe(false)
      expect(envAsBoolean('   ')).toBe(false) // trimmed to empty
    })

    it('should handle any non-true/1 string as false', () => {
      expect(envAsBoolean('anything')).toBe(false) // not 'true' or '1'
      expect(envAsBoolean('yes')).toBe(false)
      expect(envAsBoolean('on')).toBe(false)
    })
  })
})
