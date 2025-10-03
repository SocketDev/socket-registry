import { describe, expect, it } from 'vitest'

const DateImpl = require('../../packages/npm/date/Date')
const dateAuto = require('../../packages/npm/date/auto')
const dateShim = require('../../packages/npm/date/shim')

describe('date', () => {
  describe('Date constructor', () => {
    it('should export native Date', () => {
      expect(DateImpl).toBe(Date)
    })

    it('should create a Date instance', () => {
      const date = new DateImpl(2025, 9, 3)
      expect(date).toBeInstanceOf(Date)
    })

    it('should support Date.now()', () => {
      const now = DateImpl.now()
      expect(typeof now).toBe('number')
      expect(now).toBeGreaterThan(0)
    })

    it('should support Date.parse()', () => {
      const parsed = DateImpl.parse('2025-10-03T00:00:00.000Z')
      expect(typeof parsed).toBe('number')
      expect(parsed).toBeGreaterThan(0)
    })

    it('should support Date.UTC()', () => {
      const utc = DateImpl.UTC(2025, 9, 3)
      expect(typeof utc).toBe('number')
      expect(utc).toBeGreaterThan(0)
    })
  })

  describe('Date.prototype methods', () => {
    const testDate = new DateImpl('2025-10-03T12:34:56.789Z')

    it('should support getDate()', () => {
      const result = testDate.getDate()
      expect(typeof result).toBe('number')
    })

    it('should support getFullYear()', () => {
      const result = testDate.getFullYear()
      expect(typeof result).toBe('number')
      expect(result).toBe(2025)
    })

    it('should support getMonth()', () => {
      const result = testDate.getMonth()
      expect(typeof result).toBe('number')
      expect(result).toBeGreaterThanOrEqual(0)
      expect(result).toBeLessThanOrEqual(11)
    })

    it('should support getUTCDate()', () => {
      const result = testDate.getUTCDate()
      expect(typeof result).toBe('number')
      expect(result).toBe(3)
    })

    it('should support getUTCFullYear()', () => {
      const result = testDate.getUTCFullYear()
      expect(typeof result).toBe('number')
      expect(result).toBe(2025)
    })

    it('should support getUTCMonth()', () => {
      const result = testDate.getUTCMonth()
      expect(typeof result).toBe('number')
      expect(result).toBe(9)
    })

    it('should support toISOString()', () => {
      const result = testDate.toISOString()
      expect(typeof result).toBe('string')
      expect(result).toBe('2025-10-03T12:34:56.789Z')
    })

    it('should support toJSON()', () => {
      const result = testDate.toJSON()
      expect(typeof result).toBe('string')
      expect(result).toBe('2025-10-03T12:34:56.789Z')
    })

    it('should support toUTCString()', () => {
      const result = testDate.toUTCString()
      expect(typeof result).toBe('string')
      expect(result).toContain('2025')
    })
  })

  describe(
    'Date string formatting',
    { skip: process.platform === 'win32' },
    () => {
      const testDate = new DateImpl('2025-10-03T12:34:56.789Z')

      it('should support toDateString()', () => {
        const result = testDate.toDateString()
        expect(typeof result).toBe('string')
        expect(result).toContain('2025')
      })

      it('should support toString()', () => {
        const result = testDate.toString()
        expect(typeof result).toBe('string')
        expect(result).toContain('2025')
      })
    },
  )

  describe('shim', () => {
    it('should be a function', () => {
      expect(typeof dateShim).toBe('function')
    })

    it('should not throw when called', () => {
      expect(() => dateShim()).not.toThrow()
    })
  })

  describe('auto', () => {
    it('should not throw when required', () => {
      expect(dateAuto).toBeDefined()
    })
  })
})
