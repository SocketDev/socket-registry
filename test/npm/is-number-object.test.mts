import { describe, expect, it } from 'vitest'

const isNumber = require('../../packages/npm/is-number-object')

const hasToStringTag =
  typeof Symbol === 'function' && typeof Symbol.toStringTag === 'symbol'

describe('is-number-object', () => {
  describe('not Numbers', () => {
    it('should return false for undefined', () => {
      expect(isNumber(undefined)).toBe(false)
    })

    it('should return false for null', () => {
      expect(isNumber(null)).toBe(false)
    })

    it('should return false for boolean false', () => {
      expect(isNumber(false)).toBe(false)
    })

    it('should return false for boolean true', () => {
      expect(isNumber(true)).toBe(false)
    })

    it('should return false for string', () => {
      expect(isNumber('foo')).toBe(false)
    })

    it('should return false for array', () => {
      expect(isNumber([])).toBe(false)
    })

    it('should return false for object', () => {
      expect(isNumber({})).toBe(false)
    })

    it('should return false for function', () => {
      expect(isNumber(() => {})).toBe(false)
    })

    it('should return false for regex literal', () => {
      expect(isNumber(/a/g)).toBe(false)
    })

    it('should return false for regex object', () => {
      expect(isNumber(new RegExp('a', 'g'))).toBe(false)
    })

    it('should return false for new Date()', () => {
      expect(isNumber(new Date())).toBe(false)
    })
  })

  describe('@@toStringTag', { skip: !hasToStringTag }, () => {
    it('should return false for fake Number with @@toStringTag', () => {
      const fakeNumber = {
        toString() {
          return '7'
        },
        valueOf() {
          return 42
        },
        [Symbol.toStringTag]: 'Number',
      }
      expect(isNumber(fakeNumber)).toBe(false)
    })
  })

  describe('Numbers', () => {
    it('should return true for number', () => {
      expect(isNumber(42)).toBe(true)
    })

    it('should return true for number object', () => {
      expect(isNumber(Object(42))).toBe(true)
    })

    it('should return true for NaN', () => {
      expect(isNumber(NaN)).toBe(true)
    })

    it('should return true for Infinity', () => {
      expect(isNumber(Infinity)).toBe(true)
    })
  })
})
