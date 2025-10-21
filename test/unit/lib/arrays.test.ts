/**
 * @fileoverview Tests for array utilities.
 *
 * Validates array manipulation functions including chunking, uniqueness, and formatting.
 */

import {
  arrayChunk,
  arrayUnique,
  isArray,
  joinAnd,
  joinOr,
} from '@socketsecurity/lib/arrays'
import { describe, expect, it } from 'vitest'

describe('arrays utilities', () => {
  describe('arrayChunk', () => {
    it('should split array into chunks of specified size', () => {
      const arr = [1, 2, 3, 4, 5, 6]
      const chunks = arrayChunk(arr, 2)
      expect(chunks).toEqual([
        [1, 2],
        [3, 4],
        [5, 6],
      ])
    })

    it('should use default chunk size of 2', () => {
      const arr = [1, 2, 3, 4]
      const chunks = arrayChunk(arr)
      expect(chunks).toEqual([
        [1, 2],
        [3, 4],
      ])
    })

    it('should handle array not evenly divisible by chunk size', () => {
      const arr = [1, 2, 3, 4, 5]
      const chunks = arrayChunk(arr, 2)
      expect(chunks).toEqual([[1, 2], [3, 4], [5]])
    })

    it('should handle chunk size larger than array', () => {
      const arr = [1, 2, 3]
      const chunks = arrayChunk(arr, 10)
      expect(chunks).toEqual([[1, 2, 3]])
    })

    it('should handle empty array', () => {
      const chunks = arrayChunk([], 2)
      expect(chunks).toEqual([])
    })

    it('should handle single element array', () => {
      const chunks = arrayChunk([1], 2)
      expect(chunks).toEqual([[1]])
    })

    it('should handle chunk size of 1', () => {
      const arr = [1, 2, 3]
      const chunks = arrayChunk(arr, 1)
      expect(chunks).toEqual([[1], [2], [3]])
    })

    it('should throw error for chunk size of 0', () => {
      expect(() => arrayChunk([1, 2, 3], 0)).toThrow(
        'Chunk size must be greater than 0',
      )
    })

    it('should throw error for negative chunk size', () => {
      expect(() => arrayChunk([1, 2, 3], -1)).toThrow(
        'Chunk size must be greater than 0',
      )
    })

    it('should work with readonly arrays', () => {
      const arr = [1, 2, 3, 4] as const
      const chunks = arrayChunk(arr, 2)
      expect(chunks).toEqual([
        [1, 2],
        [3, 4],
      ])
    })

    it('should work with string arrays', () => {
      const arr = ['a', 'b', 'c', 'd', 'e']
      const chunks = arrayChunk(arr, 2)
      expect(chunks).toEqual([['a', 'b'], ['c', 'd'], ['e']])
    })

    it('should work with object arrays', () => {
      const arr = [{ id: 1 }, { id: 2 }, { id: 3 }]
      const chunks = arrayChunk(arr, 2)
      expect(chunks).toEqual([[{ id: 1 }, { id: 2 }], [{ id: 3 }]])
    })
  })

  describe('arrayUnique', () => {
    it('should remove duplicate values', () => {
      const arr = [1, 2, 2, 3, 3, 3, 4]
      const unique = arrayUnique(arr)
      expect(unique).toEqual([1, 2, 3, 4])
    })

    it('should handle array with no duplicates', () => {
      const arr = [1, 2, 3, 4]
      const unique = arrayUnique(arr)
      expect(unique).toEqual([1, 2, 3, 4])
    })

    it('should handle empty array', () => {
      const unique = arrayUnique([])
      expect(unique).toEqual([])
    })

    it('should handle single element array', () => {
      const unique = arrayUnique([1])
      expect(unique).toEqual([1])
    })

    it('should handle all duplicate values', () => {
      const arr = [1, 1, 1, 1]
      const unique = arrayUnique(arr)
      expect(unique).toEqual([1])
    })

    it('should work with string arrays', () => {
      const arr = ['a', 'b', 'a', 'c', 'b']
      const unique = arrayUnique(arr)
      expect(unique).toEqual(['a', 'b', 'c'])
    })

    it('should preserve order of first occurrence', () => {
      const arr = [3, 1, 2, 1, 3, 2]
      const unique = arrayUnique(arr)
      expect(unique).toEqual([3, 1, 2])
    })

    it('should work with readonly arrays', () => {
      const arr = [1, 2, 2, 3] as const
      const unique = arrayUnique(arr)
      expect(unique).toEqual([1, 2, 3])
    })

    it('should work with mixed types', () => {
      const arr = [1, '1', 2, '2', 1]
      const unique = arrayUnique(arr)
      expect(unique).toEqual([1, '1', 2, '2'])
    })

    it('should handle boolean arrays', () => {
      const arr = [true, false, true, false, true]
      const unique = arrayUnique(arr)
      expect(unique).toEqual([true, false])
    })
  })

  describe('isArray', () => {
    it('should return true for arrays', () => {
      expect(isArray([])).toBe(true)
      expect(isArray([1, 2, 3])).toBe(true)
      expect(isArray(new Array(3))).toBe(true)
    })

    it('should return false for non-arrays', () => {
      expect(isArray({})).toBe(false)
      expect(isArray(null)).toBe(false)
      expect(isArray(undefined)).toBe(false)
      expect(isArray('array')).toBe(false)
      expect(isArray(123)).toBe(false)
    })

    it('should return false for array-like objects', () => {
      expect(isArray({ length: 0 })).toBe(false)
      expect(isArray({ 0: 'a', 1: 'b', length: 2 })).toBe(false)
    })

    it('should work with typed arrays', () => {
      expect(isArray(new Uint8Array(3))).toBe(false)
      expect(isArray(new Int32Array(3))).toBe(false)
    })
  })

  describe('joinAnd', () => {
    it('should join array with "and" conjunction', () => {
      const result = joinAnd(['apples', 'oranges', 'bananas'])
      expect(result).toBe('apples, oranges, and bananas')
    })

    it('should handle two items', () => {
      const result = joinAnd(['apples', 'oranges'])
      expect(result).toBe('apples and oranges')
    })

    it('should handle single item', () => {
      const result = joinAnd(['apples'])
      expect(result).toBe('apples')
    })

    it('should handle empty array', () => {
      const result = joinAnd([])
      expect(result).toBe('')
    })

    it('should work with readonly arrays', () => {
      const arr = ['red', 'green', 'blue'] as const
      const result = joinAnd(arr)
      expect(result).toBe('red, green, and blue')
    })

    it('should handle long lists', () => {
      const arr = ['one', 'two', 'three', 'four', 'five']
      const result = joinAnd(arr)
      expect(result).toContain('and five')
    })
  })

  describe('joinOr', () => {
    it('should join array with "or" disjunction', () => {
      const result = joinOr(['apples', 'oranges', 'bananas'])
      expect(result).toBe('apples, oranges, or bananas')
    })

    it('should handle two items', () => {
      const result = joinOr(['apples', 'oranges'])
      expect(result).toBe('apples or oranges')
    })

    it('should handle single item', () => {
      const result = joinOr(['apples'])
      expect(result).toBe('apples')
    })

    it('should handle empty array', () => {
      const result = joinOr([])
      expect(result).toBe('')
    })

    it('should work with readonly arrays', () => {
      const arr = ['red', 'green', 'blue'] as const
      const result = joinOr(arr)
      expect(result).toBe('red, green, or blue')
    })

    it('should handle long lists', () => {
      const arr = ['one', 'two', 'three', 'four', 'five']
      const result = joinOr(arr)
      expect(result).toContain('or five')
    })
  })

  describe('edge cases', () => {
    it('should handle very large arrays for chunking', () => {
      const arr = Array.from({ length: 1000 }, (_, i) => i)
      const chunks = arrayChunk(arr, 100)
      expect(chunks.length).toBe(10)
      expect(chunks[0]?.length).toBe(100)
    })

    it('should handle very large arrays for unique', () => {
      const arr = Array.from({ length: 1000 }, (_, i) => i % 10)
      const unique = arrayUnique(arr)
      expect(unique.length).toBe(10)
    })

    it('should handle special characters in joinAnd', () => {
      const result = joinAnd(['foo', 'bar', 'baz'])
      expect(typeof result).toBe('string')
    })

    it('should handle special characters in joinOr', () => {
      const result = joinOr(['foo', 'bar', 'baz'])
      expect(typeof result).toBe('string')
    })
  })
})
