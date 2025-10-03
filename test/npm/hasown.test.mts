import { describe, expect, it } from 'vitest'

const hasOwn = require('../../packages/npm/hasown')

describe('hasown', () => {
  it('should be a function', () => {
    expect(typeof hasOwn).toBe('function')
  })

  describe('error cases', () => {
    it('should throw TypeError with no arguments', () => {
      expect(() => hasOwn()).toThrow(TypeError)
    })

    it('should throw TypeError for undefined', () => {
      expect(() => hasOwn(undefined, '')).toThrow(TypeError)
    })

    it('should throw TypeError for null', () => {
      expect(() => hasOwn(null, '')).toThrow(TypeError)
    })
  })

  describe('property checks', () => {
    it('should return false for toString on normal object', () => {
      expect(hasOwn({}, 'toString')).toBe(false)
    })

    it('should return true for toString as own property', () => {
      expect(hasOwn({ toString: true }, 'toString')).toBe(true)
    })

    it('should return true for normal own property', () => {
      expect(hasOwn({ a: true }, 'a')).toBe(true)
    })

    it('should return true for array length', () => {
      expect(hasOwn([], 'length')).toBe(true)
    })

    it('should return true for string length', () => {
      expect(hasOwn('', 'length')).toBe(true)
    })
  })
})
