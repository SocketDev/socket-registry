import { describe, expect, it } from 'vitest'

import {
  merge,
  toSortedObjectFromEntries,
} from '../../registry/dist/lib/objects.js'

describe('objects module - merge array handling', () => {
  describe('merge with arrays', () => {
    it('should replace target array with source array', () => {
      const target = { items: [1, 2, 3] }
      const source = { items: [4, 5] }

      const result = merge(target, source)

      expect(result.items).toEqual([4, 5])
    })

    it('should handle source with array replacing object', () => {
      const target = { data: { nested: 'value' } }
      const source = { data: [1, 2, 3] }

      const result = merge(target, source)

      expect(result.data).toEqual([1, 2, 3])
    })

    it('should handle target array replaced by source object', () => {
      const target = { data: [1, 2, 3] }
      const source = { data: { key: 'value' } }

      const result = merge(target, source)

      expect(result.data).toEqual({ key: 'value' })
    })

    it('should skip merging when source or target is null/undefined', () => {
      const target = { a: { b: 1 }, c: null }
      const source = { c: { d: 2 }, e: undefined }

      const result = merge(target, source)

      expect(result).toEqual({
        a: { b: 1 },
        c: { d: 2 },
        e: undefined,
      })
    })

    it('should handle deeply nested arrays', () => {
      const target = {
        level1: {
          level2: {
            items: [1, 2, 3],
          },
        },
      }
      const source = {
        level1: {
          level2: {
            items: [4, 5],
          },
        },
      }

      const result = merge(target, source)

      expect(result.level1.level2.items).toEqual([4, 5])
    })
  })
})

describe('objects module - toSortedObjectFromEntries with symbols', () => {
  describe('toSortedObjectFromEntries with symbol keys', () => {
    it('should sort symbol keys separately from string keys', () => {
      const sym1 = Symbol('first')
      const sym2 = Symbol('second')

      const entries: Array<[string | symbol, any]> = [
        ['z', 1],
        [sym2, 'symbol2'],
        ['a', 2],
        [sym1, 'symbol1'],
        ['m', 3],
      ]

      const result = toSortedObjectFromEntries(entries)

      const keys = Reflect.ownKeys(result)
      // Reflect.ownKeys returns string keys first, then symbol keys
      expect(keys[0]).toBe('a')
      expect(keys[1]).toBe('m')
      expect(keys[2]).toBe('z')
      expect(keys[3]).toBe(sym1) // Symbol(first) - sorted alphabetically
      expect(keys[4]).toBe(sym2) // Symbol(second)
    })

    it('should handle object with only symbol keys', () => {
      const sym1 = Symbol('test')
      const sym2 = Symbol('another')

      const entries: Array<[symbol, any]> = [
        [sym1, 'value1'],
        [sym2, 'value2'],
      ]

      const result = toSortedObjectFromEntries(entries)

      expect(result[sym1]).toBe('value1')
      expect(result[sym2]).toBe('value2')
    })

    it('should handle mixed string, number, and symbol keys', () => {
      const sym = Symbol('sym')

      const entries: Array<[string | number | symbol, any]> = [
        ['string', 1],
        [42, 2],
        [sym, 3],
        ['another', 4],
      ]

      const result = toSortedObjectFromEntries(entries)

      expect(result[sym]).toBe(3)
      expect(result[42]).toBe(2)
      expect(result['string']).toBe(1)
    })
  })
})
