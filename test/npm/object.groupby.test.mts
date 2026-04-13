/**
 * @fileoverview Tests for object.groupby NPM package override.
 * Ported 1:1 from upstream v1.0.3 (fa1c331c):
 * https://github.com/es-shims/Object.groupBy/blob/fa1c331c346bc6e852a06d0f8fd7093be25846ab/test/tests.js
 */

import { describe, expect, it } from 'vitest'

import { setupNpmPackageTest } from '../utils/npm-package-helper.mts'

const {
  eco,
  module: groupBy,
  skip,
  sockRegPkgName,
} = await setupNpmPackageTest(import.meta.url)

describe(`${eco} > ${sockRegPkgName}`, { skip }, () => {
  describe('callback function', () => {
    it('throws for non-function callbacks', () => {
      const nonFunctions = [
        undefined,
        null,
        true,
        false,
        0,
        42,
        Infinity,
        NaN,
        '',
        'foo',
        /a/g,
        [],
        {},
      ]
      for (const nonFunction of nonFunctions) {
        expect(() => groupBy([], nonFunction)).toThrow(TypeError)
      }
    })
  })

  describe('grouping', () => {
    it('an empty array produces an empty object', () => {
      const result = groupBy([], () => 'a')
      expect(result).toEqual({ __proto__: null })
    })

    it('groups by parity', () => {
      const arr = [0, -0, 1, 2, 3, 4, 5, NaN, Infinity, -Infinity]
      const parity = (x: number) => {
        if (x !== x) {
          return undefined
        }
        if (!isFinite(x)) {
          return '\u221E'
        }
        return x % 2 === 0 ? 'even' : 'odd'
      }
      const grouped = {
        __proto__: null,
        even: [0, -0, 2, 4],
        odd: [1, 3, 5],
        undefined: [NaN],
        '\u221E': [Infinity, -Infinity],
      }
      expect(groupBy(arr, parity)).toEqual(grouped)
    })

    it('thisArg and callback arguments are as expected', () => {
      const arr = [0, -0, 1, 2, 3, 4, 5, NaN, Infinity, -Infinity]
      const result = groupBy(arr, function (this: any, x: any, i: number) {
        expect(this).toBe(undefined)
        expect(x).toBe(arr[i])
        return 42
      })
      expect(result).toEqual({ __proto__: null, 42: arr })
    })
  })
})
