/**
 * @fileoverview Tests for array.prototype.flatmap NPM package override.
 * Ported 1:1 from upstream v1.3.3 (7ebde137):
 * https://github.com/es-shims/Array.prototype.flatMap/blob/7ebde137246788a04036a73f1a6ffed5b600f22e/test/tests.js
 */

import { describe, expect, it } from 'vitest'

import { setupNpmPackageTest } from '../util/npm-package-helper.mts'

const {
  eco,
  module: flatMap,
  skip,
  sockRegPkgName,
} = await setupNpmPackageTest(import.meta.url)

describe(`${eco} > ${sockRegPkgName}`, { skip }, () => {
  describe('callback function', () => {
    it.each([[], {}, true, false, 42, 'foo', /a/g, undefined])(
      'throws for non-function %s',
      nonFunction => {
        expect(() => flatMap([], nonFunction)).toThrow(TypeError)
      },
    )
  })

  describe('flatMaps', () => {
    it('flattens and maps to tuples of item/index', () => {
      const mapped = flatMap([1, [2], [3, 4]], (x: unknown, i: number) => [
        x,
        i,
      ])
      const expected = [1, 0, [2], 1, [3, 4], 2]
      expect(mapped).toEqual(expected)
      expect(mapped.length).toBe(expected.length)
    })

    it('thisArg works as expected', () => {
      const context = {}
      let actual: unknown
      flatMap(
        [1],
        function (this: unknown) {
          // eslint-disable-next-line @typescript-eslint/no-this-alias
          actual = this
        },
        context,
      )
      expect(actual).toBe(context)
    })
  })

  describe('sparse arrays', () => {
    it('an array hole is treated the same as an empty array', () => {
      const identity = (x: unknown) => x
      // eslint-disable-next-line no-sparse-arrays
      expect(flatMap([, [1]], identity)).toEqual(flatMap([[], [1]], identity))
    })
  })

  describe('test262: staging test from v8', () => {
    it('handles array growth during callback', () => {
      const arr1 = [0, 1, 2, 3]
      const f = (e: number) => {
        arr1[4] = 42
        return e
      }
      expect(flatMap(arr1, f)).toEqual([0, 1, 2, 3])
    })

    it('handles array shrink during callback', () => {
      const arr2 = [0, 1, 2, 3]
      const g = (e: number) => {
        arr2.length = 3
        return e
      }
      expect(flatMap(arr2, g)).toEqual([0, 1, 2])
    })
  })
})
