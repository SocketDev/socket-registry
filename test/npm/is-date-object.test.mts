import { describe, expect, it } from 'vitest'

const isDate = require('../../packages/npm/is-date-object')

const hasToStringTag =
  typeof Symbol === 'function' && typeof Symbol.toStringTag === 'symbol'

describe('is-date-object', () => {
  describe('not Dates', () => {
    it('should return false for undefined', () => {
      expect(isDate(undefined)).toBe(false)
    })

    it('should return false for null', () => {
      expect(isDate(null)).toBe(false)
    })

    it('should return false for boolean false', () => {
      expect(isDate(false)).toBe(false)
    })

    it('should return false for boolean true', () => {
      expect(isDate(true)).toBe(false)
    })

    it('should return false for number', () => {
      expect(isDate(42)).toBe(false)
    })

    it('should return false for string', () => {
      expect(isDate('foo')).toBe(false)
    })

    it('should return false for array', () => {
      expect(isDate([])).toBe(false)
    })

    it('should return false for object', () => {
      expect(isDate({})).toBe(false)
    })

    it('should return false for function', () => {
      expect(isDate(() => {})).toBe(false)
    })

    it('should return false for regex literal', () => {
      expect(isDate(/a/g)).toBe(false)
    })

    it('should return false for regex object', () => {
      expect(isDate(new RegExp('a', 'g'))).toBe(false)
    })
  })

  describe('@@toStringTag', { skip: !hasToStringTag }, () => {
    it('should return false for fake Date with @@toStringTag', () => {
      const realDate = new Date()
      const fakeDate = {
        toString() {
          return String(realDate)
        },
        valueOf() {
          return realDate.getTime()
        },
        [Symbol.toStringTag]: 'Date',
      }
      expect(isDate(fakeDate)).toBe(false)
    })
  })

  describe('Dates', () => {
    it('should return true for new Date()', () => {
      expect(isDate(new Date())).toBe(true)
    })
  })
})
