/**
 * @fileoverview Tests for sorting utilities.
 *
 * Validates comparison functions including locale-aware, natural, and semver sorting.
 */
import { describe, expect, it } from 'vitest'

import {
  compareSemver,
  compareStr,
  localeCompare,
  naturalCompare,
  naturalSorter,
} from '../../../registry/dist/lib/sorts.js'

describe('sorts utilities', () => {
  describe('localeCompare', () => {
    it('should return 0 for equal strings', () => {
      expect(localeCompare('test', 'test')).toBe(0)
    })

    it('should return negative for first string before second', () => {
      expect(localeCompare('a', 'b')).toBeLessThan(0)
    })

    it('should return positive for first string after second', () => {
      expect(localeCompare('b', 'a')).toBeGreaterThan(0)
    })

    it('should handle empty strings', () => {
      expect(localeCompare('', '')).toBe(0)
      expect(localeCompare('', 'a')).toBeLessThan(0)
      expect(localeCompare('a', '')).toBeGreaterThan(0)
    })

    it('should be case-sensitive by default', () => {
      const result = localeCompare('A', 'a')
      expect(result).not.toBe(0)
    })

    it('should handle Unicode characters', () => {
      expect(localeCompare('café', 'cafe')).not.toBe(0)
    })

    it('should sort array correctly', () => {
      const arr = ['zebra', 'apple', 'banana']
      arr.sort(localeCompare)
      expect(arr).toEqual(['apple', 'banana', 'zebra'])
    })
  })

  describe('naturalCompare', () => {
    it('should return 0 for equal strings', () => {
      expect(naturalCompare('test', 'test')).toBe(0)
    })

    it('should handle numeric sorting', () => {
      expect(naturalCompare('file2', 'file10')).toBeLessThan(0)
      expect(naturalCompare('file10', 'file2')).toBeGreaterThan(0)
    })

    it('should be case-insensitive', () => {
      expect(naturalCompare('Test', 'test')).toBe(0)
      expect(naturalCompare('ABC', 'abc')).toBe(0)
    })

    it('should handle numbers in strings', () => {
      const arr = ['item1', 'item10', 'item2', 'item20']
      arr.sort(naturalCompare)
      expect(arr).toEqual(['item1', 'item2', 'item10', 'item20'])
    })

    it('should handle empty strings', () => {
      expect(naturalCompare('', '')).toBe(0)
    })

    it('should handle mixed alphanumeric', () => {
      const arr = ['z1', 'a10', 'a2', 'z10']
      arr.sort(naturalCompare)
      expect(arr).toEqual(['a2', 'a10', 'z1', 'z10'])
    })

    it('should ignore diacritics', () => {
      expect(naturalCompare('café', 'cafe')).toBe(0)
      expect(naturalCompare('naïve', 'naive')).toBe(0)
    })

    it('should handle leading zeros', () => {
      const arr = ['file01', 'file001', 'file1']
      arr.sort(naturalCompare)
      // Natural compare treats 1, 01, and 001 as equal numerically
      expect(arr.length).toBe(3)
    })
  })

  describe('naturalSorter', () => {
    it('should sort strings naturally', () => {
      const arr = ['file10', 'file2', 'file1', 'file20']
      const result = naturalSorter(arr).asc()
      expect(result).toEqual(['file1', 'file2', 'file10', 'file20'])
    })

    it('should sort in descending order', () => {
      const arr = ['file1', 'file2', 'file10']
      const result = naturalSorter(arr).desc()
      expect(result).toEqual(['file10', 'file2', 'file1'])
    })

    it('should handle empty array', () => {
      const result = naturalSorter([]).asc()
      expect(result).toEqual([])
    })

    it('should handle single element', () => {
      const result = naturalSorter(['item']).asc()
      expect(result).toEqual(['item'])
    })

    it('should work with objects using by()', () => {
      const arr = [{ name: 'file10' }, { name: 'file2' }, { name: 'file1' }]
      const result = naturalSorter(arr).asc((item: any) => item.name)
      expect(result[0].name).toBe('file1')
      expect(result[2].name).toBe('file10')
    })

    it('should handle case-insensitive sorting', () => {
      const arr = ['Zebra', 'apple', 'Banana']
      const result = naturalSorter(arr).asc()
      expect(result).toEqual(['apple', 'Banana', 'Zebra'])
    })
  })

  describe('compareStr', () => {
    it('should return 0 for equal strings', () => {
      expect(compareStr('test', 'test')).toBe(0)
    })

    it('should return -1 for first string before second', () => {
      expect(compareStr('a', 'b')).toBe(-1)
    })

    it('should return 1 for first string after second', () => {
      expect(compareStr('b', 'a')).toBe(1)
    })

    it('should be case-sensitive', () => {
      expect(compareStr('A', 'a')).toBe(-1)
      expect(compareStr('a', 'A')).toBe(1)
    })

    it('should handle empty strings', () => {
      expect(compareStr('', '')).toBe(0)
      expect(compareStr('', 'a')).toBe(-1)
      expect(compareStr('a', '')).toBe(1)
    })

    it('should sort array correctly', () => {
      const arr = ['zebra', 'apple', 'banana']
      arr.sort(compareStr)
      expect(arr).toEqual(['apple', 'banana', 'zebra'])
    })

    it('should handle numbers as strings', () => {
      expect(compareStr('10', '2')).toBe(-1) // Lexical ordering
    })

    it('should handle Unicode', () => {
      expect(compareStr('café', 'cafe')).toBe(1)
    })
  })

  describe('compareSemver', () => {
    it('should return 0 for equal versions', () => {
      expect(compareSemver('1.0.0', '1.0.0')).toBe(0)
    })

    it('should return negative for older version', () => {
      expect(compareSemver('1.0.0', '2.0.0')).toBeLessThan(0)
    })

    it('should return positive for newer version', () => {
      expect(compareSemver('2.0.0', '1.0.0')).toBeGreaterThan(0)
    })

    it('should handle patch versions', () => {
      expect(compareSemver('1.0.0', '1.0.1')).toBeLessThan(0)
      expect(compareSemver('1.0.1', '1.0.0')).toBeGreaterThan(0)
    })

    it('should handle minor versions', () => {
      expect(compareSemver('1.0.0', '1.1.0')).toBeLessThan(0)
      expect(compareSemver('1.1.0', '1.0.0')).toBeGreaterThan(0)
    })

    it('should handle major versions', () => {
      expect(compareSemver('1.0.0', '2.0.0')).toBeLessThan(0)
      expect(compareSemver('2.0.0', '1.0.0')).toBeGreaterThan(0)
    })

    it('should handle prerelease versions', () => {
      expect(compareSemver('1.0.0-alpha', '1.0.0')).toBeLessThan(0)
      expect(compareSemver('1.0.0', '1.0.0-alpha')).toBeGreaterThan(0)
    })

    it('should return 0 for both invalid versions', () => {
      expect(compareSemver('invalid', 'also-invalid')).toBe(0)
    })

    it('should return -1 when first version is invalid', () => {
      expect(compareSemver('invalid', '1.0.0')).toBe(-1)
    })

    it('should return 1 when second version is invalid', () => {
      expect(compareSemver('1.0.0', 'invalid')).toBe(1)
    })

    it('should sort version array correctly', () => {
      const versions = ['2.0.0', '1.0.0', '1.1.0', '0.9.0']
      versions.sort(compareSemver)
      expect(versions).toEqual(['0.9.0', '1.0.0', '1.1.0', '2.0.0'])
    })

    it('should handle complex versions', () => {
      expect(compareSemver('1.0.0-alpha.1', '1.0.0-alpha.2')).toBeLessThan(0)
    })
  })

  describe('edge cases', () => {
    it('should handle very long strings in localeCompare', () => {
      const long1 = 'a'.repeat(1000)
      const long2 = 'b'.repeat(1000)
      expect(localeCompare(long1, long2)).toBeLessThan(0)
    })

    it('should handle large numbers in naturalCompare', () => {
      expect(naturalCompare('file999', 'file1000')).toBeLessThan(0)
    })

    it('should handle special characters in compareStr', () => {
      expect(compareStr('test!', 'test@')).toBeLessThan(0)
    })

    it('should handle build metadata in semver', () => {
      expect(compareSemver('1.0.0+build1', '1.0.0+build2')).toBe(0) // Build metadata ignored
    })
  })
})
