import { describe, expect, it } from 'vitest'

import {
  compareSemver,
  compareStr,
  localeCompare,
  naturalCompare,
  naturalSorter,
} from '../../registry/dist/lib/sorts.js'

describe('sorts module', () => {
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
    it('should compare strings using locale comparison', () => {
      expect(localeCompare('a', 'b')).toBeLessThan(0)
      expect(localeCompare('b', 'a')).toBeGreaterThan(0)
      expect(localeCompare('a', 'a')).toBe(0)
    })

    it('should handle case-insensitive comparison', () => {
      const result1 = localeCompare('A', 'a')
      const result2 = localeCompare('a', 'A')
      expect(typeof result1).toBe('number')
      expect(typeof result2).toBe('number')
    })

    it('should handle accented characters', () => {
      expect(localeCompare('café', 'cafe')).not.toBe(0)
      expect(localeCompare('naïve', 'naive')).not.toBe(0)
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

    it('should lazy load the collator', () => {
      const result1 = localeCompare('test1', 'test2')
      const result2 = localeCompare('test1', 'test2')
      expect(result1).toBe(result2)
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
      expect(naturalCompare('Apple', 'apple')).toBe(0)
      expect(naturalCompare('BANANA', 'banana')).toBe(0)
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
      const result1 = naturalCompare('test1', 'test2')
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
      // @ts-expect-error - Known string type from test data.
      expect(sorted[0].toLowerCase()).toBe('alpha')
      // @ts-expect-error - Known string type from test data.
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
      const arr = ['v1.0.10', 'v1.0.2', 'v1.0.1', 'v2.0.0']
      const sorted = naturalSorter(arr).asc()
      expect(sorted).toEqual(['v1.0.1', 'v1.0.2', 'v1.0.10', 'v2.0.0'])
    })

    it('should handle file names with extensions', () => {
      const arr = ['file10.txt', 'file2.txt', 'file1.txt', 'file20.txt']
      const sorted = naturalSorter(arr).asc()
      expect(sorted).toEqual([
        'file1.txt',
        'file2.txt',
        'file10.txt',
        'file20.txt',
      ])
    })

    it('should lazy load fast-sort', () => {
      const sorter1 = naturalSorter(['b', 'a'])
      const result1 = sorter1.asc()

      const sorter2 = naturalSorter(['d', 'c'])
      const result2 = sorter2.asc()

      expect(result1).toEqual(['a', 'b'])
      expect(result2).toEqual(['c', 'd'])
    })

    it('should sort by object properties', () => {
      const arr = [{ name: 'file10' }, { name: 'file2' }, { name: 'file1' }]
      const sorter = naturalSorter(arr)
      // @ts-expect-error - Testing runtime behavior with property name string.
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
      // @ts-expect-error - Testing runtime behavior with property name array.
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
