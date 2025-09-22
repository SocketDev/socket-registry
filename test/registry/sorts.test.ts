import { describe, expect, it } from 'vitest'

const {
  localeCompare,
  naturalCompare,
  naturalSorter
} = require('@socketsecurity/registry/lib/sorts')

describe('sorts module', () => {
  describe('localeCompare', () => {
    it('should compare strings using locale comparison', () => {
      expect(localeCompare('a', 'b')).toBeLessThan(0)
      expect(localeCompare('b', 'a')).toBeGreaterThan(0)
      expect(localeCompare('a', 'a')).toBe(0)
    })

    it('should handle case-insensitive comparison', () => {
      const result = localeCompare('Apple', 'apple')
      // Result may vary by locale, but should be consistent
      expect(typeof result).toBe('number')
    })

    it('should handle accented characters', () => {
      const result1 = localeCompare('café', 'cafe')
      const result2 = localeCompare('naïve', 'naive')
      expect(typeof result1).toBe('number')
      expect(typeof result2).toBe('number')
    })

    it('should handle empty strings', () => {
      expect(localeCompare('', 'a')).toBeLessThan(0)
      expect(localeCompare('a', '')).toBeGreaterThan(0)
      expect(localeCompare('', '')).toBe(0)
    })

    it('should handle special characters', () => {
      const result = localeCompare('a-b', 'a_b')
      expect(typeof result).toBe('number')
    })

    it('should work with array sort', () => {
      const arr = ['zebra', 'apple', 'mango', 'banana']
      arr.sort(localeCompare)
      expect(arr[0]).toBe('apple')
      expect(arr[arr.length - 1]).toBe('zebra')
    })
  })

  describe('naturalCompare', () => {
    it('should compare strings naturally', () => {
      expect(naturalCompare('a', 'b')).toBeLessThan(0)
      expect(naturalCompare('b', 'a')).toBeGreaterThan(0)
      expect(naturalCompare('a', 'a')).toBe(0)
    })

    it('should handle numbers within strings', () => {
      expect(naturalCompare('item2', 'item10')).toBeLessThan(0)
      expect(naturalCompare('item10', 'item2')).toBeGreaterThan(0)
      expect(naturalCompare('item10', 'item10')).toBe(0)
    })

    it('should handle version strings', () => {
      expect(naturalCompare('v1.2', 'v1.10')).toBeLessThan(0)
      expect(naturalCompare('v1.10', 'v1.2')).toBeGreaterThan(0)
      expect(naturalCompare('v2.0', 'v1.10')).toBeGreaterThan(0)
    })

    it('should be case insensitive', () => {
      expect(naturalCompare('Apple', 'banana')).toBeLessThan(0)
      expect(naturalCompare('ZEBRA', 'apple')).toBeGreaterThan(0)
    })

    it('should handle mixed alphanumeric', () => {
      expect(naturalCompare('a1b2', 'a1b10')).toBeLessThan(0)
      expect(naturalCompare('file-2', 'file-10')).toBeLessThan(0)
      expect(naturalCompare('test_1_a', 'test_10_a')).toBeLessThan(0)
    })

    it('should handle empty strings', () => {
      expect(naturalCompare('', 'a')).toBeLessThan(0)
      expect(naturalCompare('a', '')).toBeGreaterThan(0)
      expect(naturalCompare('', '')).toBe(0)
    })

    it('should handle pure numbers', () => {
      expect(naturalCompare('10', '2')).toBeGreaterThan(0)
      expect(naturalCompare('100', '20')).toBeGreaterThan(0)
      expect(naturalCompare('3', '20')).toBeLessThan(0)
    })
  })

  describe('naturalSorter', () => {
    it('should sort arrays naturally', () => {
      const arr = ['item10', 'item2', 'item1', 'item20']
      const sorted = naturalSorter(arr).asc()
      expect(sorted).toEqual(['item1', 'item2', 'item10', 'item20'])
    })

    it('should handle descending order', () => {
      const arr = ['item10', 'item2', 'item1', 'item20']
      const sorted = naturalSorter(arr).desc()
      expect(sorted).toEqual(['item20', 'item10', 'item2', 'item1'])
    })

    it('should handle ascending order explicitly', () => {
      const arr = ['v1.10', 'v1.2', 'v1.1', 'v2.0']
      const sorted = naturalSorter(arr).asc()
      expect(sorted).toEqual(['v1.1', 'v1.2', 'v1.10', 'v2.0'])
    })

    it('should sort mixed case naturally', () => {
      const arr = ['Beta', 'alpha', 'Delta', 'charlie']
      const sorted = naturalSorter(arr).asc()
      expect(sorted[0].toLowerCase()).toBe('alpha')
      expect(sorted[sorted.length - 1].toLowerCase()).toBe('delta')
    })

    it('should handle empty arrays', () => {
      const arr: string[] = []
      const sorted = naturalSorter(arr).asc()
      expect(sorted).toEqual([])
    })

    it('should handle single element arrays', () => {
      const arr = ['single']
      const sorted = naturalSorter(arr).asc()
      expect(sorted).toEqual(['single'])
    })

    it('should handle complex version strings', () => {
      const arr = ['2.0.0', '1.0.0', '1.10.0', '1.2.0', '1.1.1']
      const sorted = naturalSorter(arr).asc()
      expect(sorted).toEqual(['1.0.0', '1.1.1', '1.2.0', '1.10.0', '2.0.0'])
    })

    it('should handle file names with extensions', () => {
      const arr = ['file10.txt', 'file2.txt', 'file1.txt', 'file20.txt']
      const sorted = naturalSorter(arr).asc()
      expect(sorted).toEqual([
        'file1.txt',
        'file2.txt',
        'file10.txt',
        'file20.txt'
      ])
    })
  })
})
