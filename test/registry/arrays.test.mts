import { describe, expect, it } from 'vitest'

import {
  arrayChunk,
  arrayUnique,
  joinAnd,
  joinOr,
} from '../../registry/dist/lib/arrays.js'

describe('arrays module', () => {
  describe('arrayChunk', () => {
    it('should chunk arrays into specified size', () => {
      expect(arrayChunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]])
      expect(arrayChunk([1, 2, 3, 4, 5, 6], 2)).toEqual([
        [1, 2],
        [3, 4],
        [5, 6],
      ])
      expect(arrayChunk([1, 2, 3, 4, 5, 6], 3)).toEqual([
        [1, 2, 3],
        [4, 5, 6],
      ])
    })

    it('should handle chunk size of 1', () => {
      expect(arrayChunk([1, 2, 3], 1)).toEqual([[1], [2], [3]])
    })

    it('should handle chunk size larger than array', () => {
      expect(arrayChunk([1, 2, 3], 5)).toEqual([[1, 2, 3]])
    })

    it('should handle empty arrays', () => {
      expect(arrayChunk([], 2)).toEqual([])
    })

    it('should handle single element arrays', () => {
      expect(arrayChunk([1], 2)).toEqual([[1]])
    })

    it('should handle invalid chunk sizes', () => {
      // Invalid sizes cause issues, so test for throws or skip.
      expect(() => arrayChunk([1, 2, 3], 0)).toThrow()
      expect(() => arrayChunk([1, 2, 3], -1)).toThrow()
    })
  })

  describe('arrayUnique', () => {
    it('should remove duplicate values', () => {
      expect(arrayUnique([1, 2, 2, 3, 3, 3])).toEqual([1, 2, 3])
      expect(arrayUnique(['a', 'b', 'a', 'c'])).toEqual(['a', 'b', 'c'])
    })

    it('should handle arrays without duplicates', () => {
      expect(arrayUnique([1, 2, 3])).toEqual([1, 2, 3])
    })

    it('should handle empty arrays', () => {
      expect(arrayUnique([])).toEqual([])
    })

    it('should handle single element arrays', () => {
      expect(arrayUnique([1])).toEqual([1])
    })

    it('should preserve order of first occurrence', () => {
      expect(arrayUnique([3, 1, 2, 1, 3])).toEqual([3, 1, 2])
    })

    it('should handle mixed types', () => {
      expect(arrayUnique([1, '1', 2, '2', 1, '1'])).toEqual([1, '1', 2, '2'])
    })

    it('should handle null and undefined', () => {
      expect(arrayUnique([null, undefined, null, undefined])).toEqual([
        null,
        undefined,
      ])
    })

    it('should handle objects by reference', () => {
      const obj1 = { a: 1 }
      const obj2 = { a: 1 }
      expect(arrayUnique([obj1, obj2, obj1])).toEqual([obj1, obj2])
    })
  })

  describe('joinAnd', () => {
    it('should join array with "and"', () => {
      expect(joinAnd(['apple', 'banana', 'orange'])).toBe(
        'apple, banana, and orange',
      )
      expect(joinAnd(['one', 'two'])).toBe('one and two')
      expect(joinAnd(['single'])).toBe('single')
    })

    it('should handle empty arrays', () => {
      expect(joinAnd([])).toBe('')
    })

    it('should handle string values', () => {
      expect(joinAnd(['1', '2', '3'])).toBe('1, 2, and 3')
    })

    it('should handle string arrays only', () => {
      expect(joinAnd(['a', 'b', 'c'])).toBe('a, b, and c')
    })
  })

  describe('joinOr', () => {
    it('should join array with "or"', () => {
      expect(joinOr(['apple', 'banana', 'orange'])).toBe(
        'apple, banana, or orange',
      )
      expect(joinOr(['yes', 'no'])).toBe('yes or no')
      expect(joinOr(['single'])).toBe('single')
    })

    it('should handle empty arrays', () => {
      expect(joinOr([])).toBe('')
    })

    it('should handle string values', () => {
      expect(joinOr(['1', '2', '3'])).toBe('1, 2, or 3')
    })

    it('should handle string arrays only', () => {
      expect(joinOr(['a', 'b', 'c'])).toBe('a, b, or c')
    })
  })
})
