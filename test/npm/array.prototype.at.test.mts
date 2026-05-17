/**
 * @fileoverview Tests for array.prototype.at NPM package override.
 * Ported 1:1 from upstream v1.1.3 (69290c016ce3eec58ea0d17f9cc187d582fb5505):
 * https://github.com/es-shims/Array.prototype.at/blob/69290c016ce3eec58ea0d17f9cc187d582fb5505/test/tests.js
 */

import { describe, expect, it } from 'vitest'

import { setupNpmPackageTest } from '../util/npm-package-helper.mts'

const {
  eco,
  module: at,
  skip,
  sockRegPkgName,
} = await setupNpmPackageTest(import.meta.url)

describe(`${eco} > ${sockRegPkgName}`, { skip }, () => {
  describe('at', () => {
    const arr = [1, [2], [3, 4]]

    it('returns element at positive index', () => {
      expect(at(arr, 0)).toBe(arr[0])
      expect(at(arr, 1)).toEqual(arr[1])
      expect(at(arr, 2)).toEqual(arr[2])
    })

    it('returns element at negative index', () => {
      expect(at(arr, -3)).toBe(arr[0])
      expect(at(arr, -2)).toEqual(arr[1])
      expect(at(arr, -1)).toEqual(arr[2])
    })

    it('returns undefined for out-of-bounds index', () => {
      expect(at(arr, 3)).toBe(undefined)
      expect(at(arr, -4)).toBe(undefined)
      expect(at(arr, Infinity)).toBe(undefined)
      expect(at(arr, -Infinity)).toBe(undefined)
    })

    it('returns undefined for empty arrays', () => {
      expect(at([], 0)).toBe(undefined)
      expect(at([], -1)).toBe(undefined)
    })
  })

  describe('sparse arrays', () => {
    it('handles sparse array elements', () => {
      // eslint-disable-next-line no-sparse-arrays
      const arr = [, [1]]
      expect(at(arr, 0)).toBe(undefined)
      expect(at(arr, -2)).toBe(undefined)

      expect(at(arr, 1)).toEqual([1])
      expect(at(arr, -1)).toEqual([1])
    })
  })
})
