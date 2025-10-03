import { describe, expect, it } from 'vitest'

const define = require('../../packages/npm/define-properties')

const arePropertyDescriptorsSupported = (): boolean => {
  const obj: Record<string, unknown> = { a: 1 }
  try {
    Object.defineProperty(obj, 'x', { value: obj })
    return obj['x'] === obj
  } catch {
    return false
  }
}

const descriptorsSupported =
  !!Object.defineProperty && arePropertyDescriptorsSupported()
const hasSymbols =
  typeof Symbol === 'function' && typeof Symbol('foo') === 'symbol'

const getDescriptor = (value: unknown) => ({
  configurable: true,
  enumerable: false,
  value,
  writable: true,
})

describe('define-properties', () => {
  it('should export supportsDescriptors property', () => {
    expect(define.supportsDescriptors).toBe(true)
  })

  describe('with descriptor support', { skip: !descriptorsSupported }, () => {
    it('should not override existing properties', () => {
      const obj = {
        a: 1,
        b: 2,
        c: 3,
      }
      expect(Object.keys(obj)).toEqual(['a', 'b', 'c'])

      define(obj, {
        b: 3,
        c: 4,
        d: 5,
      })

      expect(obj).toEqual({
        a: 1,
        b: 2,
        c: 3,
      })
      expect(Object.getOwnPropertyDescriptor(obj, 'd')).toEqual(
        getDescriptor(5),
      )
      expect(Object.keys(obj)).toEqual(['a', 'b', 'c'])
    })

    it('should override properties when predicate returns true', () => {
      const obj = {
        a: 1,
        b: 2,
        c: 3,
      }

      define(obj, {
        b: 3,
        c: 4,
        d: 5,
      })

      define(
        obj,
        {
          a: 2,
          b: 3,
          c: 4,
        },
        {
          a: () => true,
          b: () => false,
        },
      )

      expect(obj).toEqual({
        b: 2,
        c: 3,
      })
      expect(Object.getOwnPropertyDescriptor(obj, 'd')).toEqual(
        getDescriptor(5),
      )
      expect(Object.getOwnPropertyDescriptor(obj, 'a')).toEqual(
        getDescriptor(2),
      )
      expect(Object.keys(obj)).toEqual(['b', 'c'])
    })

    it('should override properties when predicate is true and values are equal', () => {
      const obj = {
        a: 1,
        b: 2,
        c: 3,
      }

      define(obj, {
        b: 3,
        c: 4,
        d: 5,
      })

      define(
        obj,
        {
          a: 2,
          b: 3,
          c: 4,
        },
        {
          a: () => true,
          b: () => false,
        },
      )

      define(
        obj,
        {
          a: 4,
          b: 3,
          c: 3,
        },
        {
          a: true,
          b: true,
          c: true,
        },
      )

      expect(obj).toEqual({ c: 3 })
      expect(Object.getOwnPropertyDescriptor(obj, 'a')).toEqual(
        getDescriptor(4),
      )
      expect(Object.getOwnPropertyDescriptor(obj, 'b')).toEqual(
        getDescriptor(3),
      )
      expect(Object.getOwnPropertyDescriptor(obj, 'd')).toEqual(
        getDescriptor(5),
      )
      expect(Object.keys(obj)).toEqual(['c'])
    })
  })

  describe('without descriptor support', { skip: descriptorsSupported }, () => {
    it('should not override existing properties but add new ones', () => {
      const obj = {
        a: 1,
        b: 2,
        c: 3,
      }

      define(obj, {
        b: 3,
        c: 4,
        d: 5,
      })

      expect(obj).toEqual({
        a: 1,
        b: 2,
        c: 3,
        d: 5,
      })
    })

    it('should override properties only when predicate returns true', () => {
      const obj = {
        a: 1,
        b: 2,
        c: 3,
      }

      define(obj, {
        b: 3,
        c: 4,
        d: 5,
      })

      define(
        obj,
        {
          a: 2,
          b: 3,
          c: 4,
        },
        {
          a: () => true,
          b: () => false,
        },
      )

      expect(obj).toEqual({
        a: 2,
        b: 2,
        c: 3,
        d: 5,
      })
    })
  })

  describe('symbols', { skip: !hasSymbols }, () => {
    it('should define symbol keyed properties', () => {
      const sym = Symbol('foo')
      const obj: Record<PropertyKey, unknown> = {}
      const aValue = {}
      const bValue = {}
      const properties: Record<PropertyKey, unknown> = { a: aValue }
      properties[sym] = bValue

      define(obj, properties)

      expect(Object.keys(obj)).toEqual([])
      expect(Object.getOwnPropertyNames(obj)).toEqual(['a'])
      expect(Object.getOwnPropertySymbols(obj)).toEqual([sym])
      expect(obj['a']).toBe(aValue)
      expect(obj[sym]).toBe(bValue)
    })
  })
})
