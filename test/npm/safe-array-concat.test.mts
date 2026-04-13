/**
 * @fileoverview Tests for safe-array-concat NPM package override.
 * Ported 1:1 from upstream v1.1.3 (eff5359f):
 * https://github.com/ljharb/safe-array-concat/blob/eff5359f/test/index.js
 */
import { describe, expect, it } from 'vitest'

import { setupNpmPackageTest } from '../utils/npm-package-helper.mts'

const {
  eco,
  module: safeConcat,
  skip,
  sockRegPkgName,
} = await setupNpmPackageTest(import.meta.url)

describe(`${eco} > ${sockRegPkgName}`, { skip }, () => {
  it('is a function', () => {
    expect(typeof safeConcat).toBe('function')
  })

  it('works with flat and nested arrays', () => {
    expect(safeConcat([1, 2], [3, 4], 'foo', 5, 6, [[7]])).toEqual([
      1,
      2,
      3,
      4,
      'foo',
      5,
      6,
      [7],
    ])
  })

  it('first item as undefined is not the concat receiver', () => {
    expect(safeConcat(undefined, 1, 2)).toEqual([undefined, 1, 2])
  })

  it('first item as null is not the concat receiver', () => {
    expect(safeConcat(null, 1, 2)).toEqual([null, 1, 2])
  })

  it('ignores nonArray .constructor on first item', () => {
    const arr: any = [1, 2]
    arr.constructor = function C() {
      return { args: arguments }
    }
    expect(safeConcat(arr, 3, 4)).toEqual([1, 2, 3, 4])
  })

  it('ignores Symbol.species on first item', () => {
    const species = Symbol.species
    const speciesArr: any = [1, 2]
    speciesArr.constructor = {}
    speciesArr.constructor[species] = function Species() {
      return { args: arguments }
    }
    expect(safeConcat(speciesArr, 3, 4)).toEqual([1, 2, 3, 4])
  })
})
