import { describe, expect, it } from 'vitest'

const {
  arrayChunk,
  arrayUnique,
  joinAnd,
  joinOr,
} = require('@socketsecurity/registry/lib/arrays')

describe('array utilities', () => {
  describe('arrayChunk', () => {
    it('should chunk array into default size of 2', () => {
      const arr = [1, 2, 3, 4, 5]
      const result = arrayChunk(arr)
      expect(result).toEqual([[1, 2], [3, 4], [5]])
    })

    it('should chunk array into specified size', () => {
      const arr = [1, 2, 3, 4, 5, 6, 7]
      const result = arrayChunk(arr, 3)
      expect(result).toEqual([[1, 2, 3], [4, 5, 6], [7]])
    })

    it('should handle empty array', () => {
      const result = arrayChunk([])
      expect(result).toEqual([])
    })

    it('should handle array smaller than chunk size', () => {
      const arr = [1, 2]
      const result = arrayChunk(arr, 5)
      expect(result).toEqual([[1, 2]])
    })

    it('should handle chunk size of 1', () => {
      const arr = [1, 2, 3]
      const result = arrayChunk(arr, 1)
      expect(result).toEqual([[1], [2], [3]])
    })

    it('should handle array with exact multiple of chunk size', () => {
      const arr = [1, 2, 3, 4, 5, 6]
      const result = arrayChunk(arr, 3)
      expect(result).toEqual([
        [1, 2, 3],
        [4, 5, 6],
      ])
    })

    it('should handle large chunk size', () => {
      const arr = [1, 2, 3]
      const result = arrayChunk(arr, 10)
      expect(result).toEqual([[1, 2, 3]])
    })
  })

  describe('arrayUnique', () => {
    it('should remove duplicate primitives', () => {
      const arr = [1, 2, 2, 3, 3, 3, 4]
      const result = arrayUnique(arr)
      expect(result).toEqual([1, 2, 3, 4])
    })

    it('should remove duplicate strings', () => {
      const arr = ['a', 'b', 'a', 'c', 'b']
      const result = arrayUnique(arr)
      expect(result).toEqual(['a', 'b', 'c'])
    })

    it('should handle empty array', () => {
      const result = arrayUnique([])
      expect(result).toEqual([])
    })

    it('should handle array with no duplicates', () => {
      const arr = [1, 2, 3, 4]
      const result = arrayUnique(arr)
      expect(result).toEqual([1, 2, 3, 4])
    })

    it('should handle mixed types', () => {
      const arr = [1, '1', 2, '2', 1, '1']
      const result = arrayUnique(arr)
      expect(result).toEqual([1, '1', 2, '2'])
    })

    it('should handle boolean values', () => {
      const arr = [true, false, true, false, true]
      const result = arrayUnique(arr)
      expect(result).toEqual([true, false])
    })

    it('should handle null and undefined', () => {
      const arr = [null, undefined, null, undefined, 1]
      const result = arrayUnique(arr)
      expect(result).toEqual([null, undefined, 1])
    })

    it('should preserve order of first occurrence', () => {
      const arr = ['c', 'a', 'b', 'a', 'c']
      const result = arrayUnique(arr)
      expect(result).toEqual(['c', 'a', 'b'])
    })
  })

  describe('joinAnd', () => {
    it('should join single item', () => {
      const result = joinAnd(['apple'])
      expect(result).toBe('apple')
    })

    it('should join two items with "and"', () => {
      const result = joinAnd(['apple', 'banana'])
      expect(result).toBe('apple and banana')
    })

    it('should join multiple items with commas and "and"', () => {
      const result = joinAnd(['apple', 'banana', 'cherry'])
      expect(result).toBe('apple, banana, and cherry')
    })

    it('should handle four items', () => {
      const result = joinAnd(['apple', 'banana', 'cherry', 'date'])
      expect(result).toBe('apple, banana, cherry, and date')
    })

    it('should handle empty array', () => {
      const result = joinAnd([])
      expect(result).toBe('')
    })

    it('should handle array with empty strings', () => {
      const result = joinAnd(['', 'test', ''])
      expect(result).toBe(', test, and ')
    })

    it('should work with numbers as strings', () => {
      const result = joinAnd(['1', '2', '3'])
      expect(result).toBe('1, 2, and 3')
    })
  })

  describe('joinOr', () => {
    it('should join single item', () => {
      const result = joinOr(['apple'])
      expect(result).toBe('apple')
    })

    it('should join two items with "or"', () => {
      const result = joinOr(['apple', 'banana'])
      expect(result).toBe('apple or banana')
    })

    it('should join multiple items with commas and "or"', () => {
      const result = joinOr(['apple', 'banana', 'cherry'])
      expect(result).toBe('apple, banana, or cherry')
    })

    it('should handle four items', () => {
      const result = joinOr(['apple', 'banana', 'cherry', 'date'])
      expect(result).toBe('apple, banana, cherry, or date')
    })

    it('should handle empty array', () => {
      const result = joinOr([])
      expect(result).toBe('')
    })

    it('should handle array with empty strings', () => {
      const result = joinOr(['', 'test', ''])
      expect(result).toBe(', test, or ')
    })

    it('should work with numbers as strings', () => {
      const result = joinOr(['1', '2', '3'])
      expect(result).toBe('1, 2, or 3')
    })
  })

  describe('lazy loading formatters', () => {
    it('should lazy load conjunction formatter', () => {
      // Multiple calls should reuse the same formatter.
      const result1 = joinAnd(['a', 'b'])
      const result2 = joinAnd(['c', 'd'])
      expect(result1).toBe('a and b')
      expect(result2).toBe('c and d')
    })

    it('should lazy load disjunction formatter', () => {
      // Multiple calls should reuse the same formatter.
      const result1 = joinOr(['a', 'b'])
      const result2 = joinOr(['c', 'd'])
      expect(result1).toBe('a or b')
      expect(result2).toBe('c or d')
    })
  })
})
