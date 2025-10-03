import { describe, expect, it } from 'vitest'

const isString = require('../../packages/npm/is-string')

const hasToStringTag =
  typeof Symbol === 'function' && typeof Symbol.toStringTag === 'symbol'

describe('is-string', () => {
  describe('not Strings', () => {
    it('should return false for undefined', () => {
      expect(isString(undefined)).toBe(false)
    })

    it('should return false for null', () => {
      expect(isString(null)).toBe(false)
    })

    it('should return false for boolean false', () => {
      expect(isString(false)).toBe(false)
    })

    it('should return false for boolean true', () => {
      expect(isString(true)).toBe(false)
    })

    it('should return false for array', () => {
      expect(isString([])).toBe(false)
    })

    it('should return false for object', () => {
      expect(isString({})).toBe(false)
    })

    it('should return false for function', () => {
      expect(isString(() => {})).toBe(false)
    })

    it('should return false for regex literal', () => {
      expect(isString(/a/g)).toBe(false)
    })

    it('should return false for regex object', () => {
      expect(isString(new RegExp('a', 'g'))).toBe(false)
    })

    it('should return false for new Date()', () => {
      expect(isString(new Date())).toBe(false)
    })

    it('should return false for number', () => {
      expect(isString(42)).toBe(false)
    })

    it('should return false for number object', () => {
      expect(isString(Object(42))).toBe(false)
    })

    it('should return false for NaN', () => {
      expect(isString(NaN)).toBe(false)
    })

    it('should return false for Infinity', () => {
      expect(isString(Infinity)).toBe(false)
    })
  })

  describe('@@toStringTag', { skip: !hasToStringTag }, () => {
    it('should return false for fake String with @@toStringTag', () => {
      const fakeString = {
        toString() {
          return '7'
        },
        valueOf() {
          return '42'
        },
        [Symbol.toStringTag]: 'String',
      }
      expect(isString(fakeString)).toBe(false)
    })
  })

  describe('Strings', () => {
    it('should return true for string primitive', () => {
      expect(isString('foo')).toBe(true)
    })

    it('should return true for string object', () => {
      expect(isString(Object('foo'))).toBe(true)
    })
  })
})
