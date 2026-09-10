/**
 * @file Tests for object.groupby NPM package override. Ported 1:1 from upstream
 *   v1.0.3 (fa1c331c):
 *   https://github.com/es-shims/Object.groupBy/blob/fa1c331c346bc6e852a06d0f8fd7093be25846ab/test/tests.js.
 */

import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { createNpmFallbackLoader } from '../util/npm-fallback.mts'

import { setupNpmPackageTest } from '../util/npm-package.mts'

const {
  eco,
  module: publicModule,
  pkgPath,
  skip,
  sockRegPkgName,
} = setupNpmPackageTest(import.meta.url)

const loadFallback = createNpmFallbackLoader({
  disabledPaths: ['Object.groupBy'],
})
const implementation = skip
  ? publicModule
  : loadFallback(path.join(pkgPath, 'implementation.js'))

describe.each([
  ['public', publicModule],
  ['fallback', implementation],
])(`${eco} > ${sockRegPkgName} > %s`, { skip }, (variant, groupBy) => {
  const expectedTypeError =
    variant === 'fallback' ? loadFallback.errors.TypeError : TypeError
  describe('callback function', () => {
    it('throws for non-function callbacks', () => {
      const nonFunctions = [
        null,
        undefined,
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
      for (let i = 0, { length } = nonFunctions; i < length; i += 1) {
        const nonFunction = nonFunctions[i]
        expect(() => groupBy([], nonFunction)).toThrow(expectedTypeError)
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
      const result = groupBy(
        arr,
        function (this: unknown, x: number, i: number) {
          expect(this).toBe(undefined)
          expect(x).toBe(arr[i])
          return 42
        },
      )
      expect(result).toEqual({ __proto__: null, 42: arr })
    })
  })
})
