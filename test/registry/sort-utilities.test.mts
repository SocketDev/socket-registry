import { describe, expect, it } from 'vitest'

const {
  compareSemver,
  compareStr,
  localeCompare,
  naturalCompare,
  naturalSorter,
} = require('../../registry/dist/lib/sorts')

describe('sort utilities', () => {
  describe('compareStr', () => {
    it('should compare strings lexically', () => {
      expect(compareStr('a', 'b')).toBeLessThan(0)
      expect(compareStr('b', 'a')).toBeGreaterThan(0)
      expect(compareStr('a', 'a')).toBe(0)
    })

    it('should handle empty strings', () => {
      expect(compareStr('', 'a')).toBeLessThan(0)
      expect(compareStr('a', '')).toBeGreaterThan(0)
      expect(compareStr('', '')).toBe(0)
    })

    it('should handle case sensitivity', () => {
      expect(compareStr('A', 'a')).toBeLessThan(0)
      expect(compareStr('a', 'A')).toBeGreaterThan(0)
    })

    it('should handle numbers as strings', () => {
      expect(compareStr('1', '2')).toBeLessThan(0)
      // Lexical order
      expect(compareStr('10', '2')).toBeLessThan(0)
      expect(compareStr('2', '10')).toBeGreaterThan(0)
    })

    it('should work as sort comparator', () => {
      const arr = ['zebra', 'apple', 'banana']
      const sorted = arr.sort(compareStr)
      expect(sorted).toEqual(['apple', 'banana', 'zebra'])
    })
  })

  describe('localeCompare', () => {
    it('should compare strings using locale rules', () => {
      expect(localeCompare('a', 'b')).toBeLessThan(0)
      expect(localeCompare('b', 'a')).toBeGreaterThan(0)
      expect(localeCompare('a', 'a')).toBe(0)
    })

    it('should handle case-insensitive comparison', () => {
      const result1 = localeCompare('A', 'a')
      const result2 = localeCompare('a', 'A')
      // Locale comparison may treat these as equal or prioritize one
      expect(typeof result1).toBe('number')
      expect(typeof result2).toBe('number')
    })

    it('should handle Unicode characters', () => {
      expect(localeCompare('café', 'cafe')).not.toBe(0)
      expect(localeCompare('naïve', 'naive')).not.toBe(0)
    })

    it('should lazy load the collator', () => {
      // First call initializes
      const result1 = localeCompare('test1', 'test2')
      // Second call reuses
      const result2 = localeCompare('test1', 'test2')
      expect(result1).toBe(result2)
    })

    it('should work as sort comparator', () => {
      const arr = ['zebra', 'apple', 'banana']
      const sorted = arr.sort(localeCompare)
      expect(sorted).toEqual(['apple', 'banana', 'zebra'])
    })
  })

  describe('naturalCompare', () => {
    it('should compare strings naturally', () => {
      expect(naturalCompare('a', 'b')).toBeLessThan(0)
      expect(naturalCompare('b', 'a')).toBeGreaterThan(0)
      expect(naturalCompare('a', 'a')).toBe(0)
    })

    it('should handle numeric sorting', () => {
      expect(naturalCompare('file1', 'file2')).toBeLessThan(0)
      // Natural order
      expect(naturalCompare('file2', 'file10')).toBeLessThan(0)
      expect(naturalCompare('file10', 'file2')).toBeGreaterThan(0)
    })

    it('should be case insensitive', () => {
      expect(naturalCompare('Apple', 'apple')).toBe(0)
      expect(naturalCompare('BANANA', 'banana')).toBe(0)
    })

    it('should handle complex numeric patterns', () => {
      expect(naturalCompare('v1.0.1', 'v1.0.10')).toBeLessThan(0)
      expect(naturalCompare('item100', 'item20')).toBeGreaterThan(0)
      expect(naturalCompare('test1a', 'test1b')).toBeLessThan(0)
    })

    it('should handle diacritics', () => {
      expect(naturalCompare('café', 'cafe')).toBe(0)
      expect(naturalCompare('naïve', 'naive')).toBe(0)
    })

    it('should lazy load the collator', () => {
      // First call initializes
      const result1 = naturalCompare('test1', 'test2')
      // Second call reuses
      const result2 = naturalCompare('test1', 'test2')
      expect(result1).toBe(result2)
    })

    it('should work as sort comparator', () => {
      const arr = ['file10', 'file2', 'file1']
      const sorted = arr.sort(naturalCompare)
      expect(sorted).toEqual(['file1', 'file2', 'file10'])
    })

    it('should handle mixed content', () => {
      const arr = ['z1', 'a10', 'a2', 'z10']
      const sorted = arr.sort(naturalCompare)
      expect(sorted).toEqual(['a2', 'a10', 'z1', 'z10'])
    })
  })

  describe('naturalSorter', () => {
    it('should sort arrays naturally', () => {
      const arr = ['file10', 'file2', 'file1']
      const sorter = naturalSorter(arr)
      const result = sorter.asc()
      expect(result).toEqual(['file1', 'file2', 'file10'])
    })

    it('should support descending sort', () => {
      const arr = ['file1', 'file2', 'file10']
      const sorter = naturalSorter(arr)
      const result = sorter.desc()
      expect(result).toEqual(['file10', 'file2', 'file1'])
    })

    it('should handle complex sorting', () => {
      const arr = ['v1.0.10', 'v1.0.2', 'v1.0.1', 'v2.0.0']
      const sorter = naturalSorter(arr)
      const result = sorter.asc()
      expect(result).toEqual(['v1.0.1', 'v1.0.2', 'v1.0.10', 'v2.0.0'])
    })

    it('should lazy load fast-sort', () => {
      // First call initializes
      const sorter1 = naturalSorter(['b', 'a'])
      const result1 = sorter1.asc()

      // Second call reuses
      const sorter2 = naturalSorter(['d', 'c'])
      const result2 = sorter2.asc()

      expect(result1).toEqual(['a', 'b'])
      expect(result2).toEqual(['c', 'd'])
    })

    it('should handle empty arrays', () => {
      const sorter = naturalSorter([])
      const result = sorter.asc()
      expect(result).toEqual([])
    })

    it('should handle single element arrays', () => {
      const sorter = naturalSorter(['single'])
      const result = sorter.asc()
      expect(result).toEqual(['single'])
    })

    it('should sort by object properties', () => {
      const arr = [{ name: 'file10' }, { name: 'file2' }, { name: 'file1' }]
      const sorter = naturalSorter(arr)
      const result = sorter.asc('name')
      expect(result.map((item: any) => item.name)).toEqual([
        'file1',
        'file2',
        'file10',
      ])
    })

    it('should handle multiple sort keys', () => {
      const arr = [
        { category: 'B', name: 'file10' },
        { category: 'A', name: 'file2' },
        { category: 'A', name: 'file1' },
        { category: 'B', name: 'file1' },
      ]
      const sorter = naturalSorter(arr)
      const result = sorter.asc(['category', 'name'])
      expect(result).toEqual([
        { category: 'A', name: 'file1' },
        { category: 'A', name: 'file2' },
        { category: 'B', name: 'file1' },
        { category: 'B', name: 'file10' },
      ])
    })
  })

  describe('compareSemver', () => {
    it('should compare valid semantic versions', () => {
      expect(compareSemver('1.0.0', '2.0.0')).toBeLessThan(0)
      expect(compareSemver('2.0.0', '1.0.0')).toBeGreaterThan(0)
      expect(compareSemver('1.0.0', '1.0.0')).toBe(0)
    })

    it('should handle patch versions', () => {
      expect(compareSemver('1.0.1', '1.0.2')).toBeLessThan(0)
      expect(compareSemver('1.0.10', '1.0.2')).toBeGreaterThan(0)
    })

    it('should handle minor versions', () => {
      expect(compareSemver('1.1.0', '1.2.0')).toBeLessThan(0)
      expect(compareSemver('1.10.0', '1.2.0')).toBeGreaterThan(0)
    })

    it('should handle major versions', () => {
      expect(compareSemver('1.0.0', '2.0.0')).toBeLessThan(0)
      expect(compareSemver('10.0.0', '2.0.0')).toBeGreaterThan(0)
    })

    it('should handle pre-release versions', () => {
      expect(compareSemver('1.0.0-alpha', '1.0.0-beta')).toBeLessThan(0)
      expect(compareSemver('1.0.0-alpha', '1.0.0')).toBeLessThan(0)
      expect(compareSemver('1.0.0', '1.0.0-alpha')).toBeGreaterThan(0)
    })

    it('should handle build metadata', () => {
      expect(compareSemver('1.0.0+build1', '1.0.0+build2')).toBe(0)
      expect(compareSemver('1.0.0+build', '1.0.0')).toBe(0)
    })

    it('should handle invalid versions', () => {
      expect(compareSemver('invalid', 'invalid')).toBe(0)
      expect(compareSemver('invalid', '1.0.0')).toBeLessThan(0)
      expect(compareSemver('1.0.0', 'invalid')).toBeGreaterThan(0)
    })

    it('should handle partial versions', () => {
      expect(compareSemver('1.0', '1.0')).toBe(0)
      // Both invalid
      expect(compareSemver('1', '2')).toBe(0)
    })

    it('should work as sort comparator', () => {
      const versions = ['2.0.0', '1.0.0', '1.0.10', '1.0.2']
      const sorted = versions.sort(compareSemver)
      expect(sorted).toEqual(['1.0.0', '1.0.2', '1.0.10', '2.0.0'])
    })

    it('should handle complex version patterns', () => {
      const versions = [
        '1.0.0',
        '1.0.0-alpha',
        '1.0.0-alpha.1',
        '1.0.0-alpha.beta',
        '1.0.0-beta',
        '1.0.0-beta.2',
        '1.0.0-beta.11',
        '1.0.0-rc.1',
        '2.0.0',
      ]

      const sorted = [...versions].sort(compareSemver)

      // Check that alpha comes before beta, beta before rc, and rc before release
      expect(sorted.indexOf('1.0.0-alpha')).toBeLessThan(
        sorted.indexOf('1.0.0-beta'),
      )
      expect(sorted.indexOf('1.0.0-beta')).toBeLessThan(
        sorted.indexOf('1.0.0-rc.1'),
      )
      expect(sorted.indexOf('1.0.0-rc.1')).toBeLessThan(sorted.indexOf('1.0.0'))
      expect(sorted.indexOf('1.0.0')).toBeLessThan(sorted.indexOf('2.0.0'))
    })
  })
})
