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
      expect(arrayChunk([1, 2, 3, 4, 5, 6, 7], 3)).toEqual([
        [1, 2, 3],
        [4, 5, 6],
        [7],
      ])
    })

    it('should chunk array with default size', () => {
      expect(arrayChunk([1, 2, 3, 4, 5])).toEqual([[1, 2], [3, 4], [5]])
    })

    it('should handle chunk size of 1', () => {
      expect(arrayChunk([1, 2, 3], 1)).toEqual([[1], [2], [3]])
    })

    it('should handle chunk size larger than array', () => {
      expect(arrayChunk([1, 2, 3], 5)).toEqual([[1, 2, 3]])
      expect(arrayChunk([1, 2, 3], 10)).toEqual([[1, 2, 3]])
    })

    it('should handle empty arrays', () => {
      expect(arrayChunk([], 2)).toEqual([])
      expect(arrayChunk([])).toEqual([])
    })

    it('should handle single element arrays', () => {
      expect(arrayChunk([1], 2)).toEqual([[1]])
    })

    it('should handle invalid chunk sizes', () => {
      expect(() => arrayChunk([1, 2, 3], 0)).toThrow()
      expect(() => arrayChunk([1, 2, 3], -1)).toThrow()
    })
  })

  describe('arrayUnique', () => {
    it('should remove duplicate values', () => {
      expect(arrayUnique([1, 2, 2, 3, 3, 3])).toEqual([1, 2, 3])
      expect(arrayUnique([1, 2, 2, 3, 3, 3, 4])).toEqual([1, 2, 3, 4])
      expect(arrayUnique(['a', 'b', 'a', 'c'])).toEqual(['a', 'b', 'c'])
      expect(arrayUnique(['a', 'b', 'a', 'c', 'b'])).toEqual(['a', 'b', 'c'])
    })

    it('should handle arrays without duplicates', () => {
      expect(arrayUnique([1, 2, 3])).toEqual([1, 2, 3])
      expect(arrayUnique([1, 2, 3, 4])).toEqual([1, 2, 3, 4])
    })

    it('should handle empty arrays', () => {
      expect(arrayUnique([])).toEqual([])
    })

    it('should handle single element arrays', () => {
      expect(arrayUnique([1])).toEqual([1])
    })

    it('should preserve order of first occurrence', () => {
      expect(arrayUnique([3, 1, 2, 1, 3])).toEqual([3, 1, 2])
      expect(arrayUnique(['c', 'a', 'b', 'a', 'c'])).toEqual(['c', 'a', 'b'])
    })

    it('should handle mixed types', () => {
      expect(arrayUnique([1, '1', 2, '2', 1, '1'])).toEqual([1, '1', 2, '2'])
    })

    it('should handle boolean values', () => {
      expect(arrayUnique([true, false, true, false, true])).toEqual([
        true,
        false,
      ])
    })

    it('should handle null and undefined', () => {
      expect(arrayUnique([null, undefined, null, undefined])).toEqual([
        null,
        undefined,
      ])
      expect(arrayUnique([null, undefined, null, undefined, 1])).toEqual([
        null,
        undefined,
        1,
      ])
    })

    it('should handle objects by reference', () => {
      const obj1 = { a: 1 }
      const obj2 = { a: 1 }
      expect(arrayUnique([obj1, obj2, obj1])).toEqual([obj1, obj2])
    })
  })

  describe('joinAnd', () => {
    it('should join single item', () => {
      expect(joinAnd(['single'])).toBe('single')
      expect(joinAnd(['apple'])).toBe('apple')
    })

    it('should join two items with "and"', () => {
      expect(joinAnd(['one', 'two'])).toBe('one and two')
      expect(joinAnd(['apple', 'banana'])).toBe('apple and banana')
    })

    it('should join multiple items with commas and "and"', () => {
      expect(joinAnd(['apple', 'banana', 'orange'])).toBe(
        'apple, banana, and orange',
      )
      expect(joinAnd(['a', 'b', 'c'])).toBe('a, b, and c')
      expect(joinAnd(['1', '2', '3'])).toBe('1, 2, and 3')
    })

    it('should handle four items', () => {
      expect(joinAnd(['apple', 'banana', 'cherry', 'date'])).toBe(
        'apple, banana, cherry, and date',
      )
    })

    it('should handle empty arrays', () => {
      expect(joinAnd([])).toBe('')
    })

    it('should handle array with empty strings', () => {
      expect(joinAnd(['', 'test', ''])).toBe(', test, and ')
    })
  })

  describe('joinOr', () => {
    it('should join single item', () => {
      expect(joinOr(['single'])).toBe('single')
      expect(joinOr(['apple'])).toBe('apple')
    })

    it('should join two items with "or"', () => {
      expect(joinOr(['yes', 'no'])).toBe('yes or no')
      expect(joinOr(['apple', 'banana'])).toBe('apple or banana')
    })

    it('should join multiple items with commas and "or"', () => {
      expect(joinOr(['apple', 'banana', 'orange'])).toBe(
        'apple, banana, or orange',
      )
      expect(joinOr(['a', 'b', 'c'])).toBe('a, b, or c')
      expect(joinOr(['1', '2', '3'])).toBe('1, 2, or 3')
    })

    it('should handle four items', () => {
      expect(joinOr(['apple', 'banana', 'cherry', 'date'])).toBe(
        'apple, banana, cherry, or date',
      )
    })

    it('should handle empty arrays', () => {
      expect(joinOr([])).toBe('')
    })

    it('should handle array with empty strings', () => {
      expect(joinOr(['', 'test', ''])).toBe(', test, or ')
    })
  })

  describe('lazy loading formatters', () => {
    it('should lazy load conjunction formatter', () => {
      const result1 = joinAnd(['a', 'b'])
      const result2 = joinAnd(['c', 'd'])
      expect(result1).toBe('a and b')
      expect(result2).toBe('c and d')
    })

    it('should lazy load disjunction formatter', () => {
      const result1 = joinOr(['a', 'b'])
      const result2 = joinOr(['c', 'd'])
      expect(result1).toBe('a or b')
      expect(result2).toBe('c or d')
    })
  })
})
