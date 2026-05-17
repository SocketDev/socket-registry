/**
 * @fileoverview Tests for array.prototype.find NPM package override.
 * Ported 1:1 from upstream v2.2.3 (cdc51a13770d15cfaa2ef8f650d7bc6627603bf4):
 * https://github.com/es-shims/Array.prototype.find/blob/cdc51a13770d15cfaa2ef8f650d7bc6627603bf4/test/tests.js
 */

import { describe, expect, it } from 'vitest'

import { setupNpmPackageTest } from '../util/npm-package-helper.mts'

const {
  eco,
  module: find,
  skip,
  sockRegPkgName,
} = await setupNpmPackageTest(import.meta.url)

const canDistinguishSparseFromUndefined = 0 in [undefined]

const thrower = () => {
  throw new Error('should not reach here')
}

describe(`${eco} > ${sockRegPkgName}`, { skip }, () => {
  const list = [5, 10, 15, 20]

  it('finds item by predicate', () => {
    expect(find(list, (item: number) => item === 15)).toBe(15)
  })

  it('returns undefined when nothing matches', () => {
    expect(find(list, (item: any) => item === 'a')).toBe(undefined)
  })

  it('throws without callback', () => {
    expect(() => find(list)).toThrow(TypeError)
  })

  it('receives all three arguments', () => {
    const context = {}
    const foundIndex = find(
      list,
      function (this: any, value: number, index: number, arr: number[]) {
        expect(list[index]).toBe(value)
        expect(arr).toEqual(list)
        expect(this).toBe(context)
        return false
      },
      context,
    )
    expect(foundIndex).toBe(undefined)
  })

  it('works with an array-like object', () => {
    const arraylike = { 0: 1, 1: 2, 2: 3, length: 3 }
    const found = find(arraylike, (item: number) => item === 2)
    expect(found).toBe(2)
  })

  it('works with an array-like object with negative length', () => {
    expect(find({ 0: 1, 1: 2, 2: 3, length: -3 }, thrower)).toBe(undefined)
  })

  describe(
    'sparse arrays',
    { skip: !canDistinguishSparseFromUndefined },
    () => {
      it('works with a sparse array', () => {
        // eslint-disable-next-line no-sparse-arrays
        const obj = [1, , undefined] as any[]
        expect(1 in obj).toBe(false)
        const seen: Array<[number, any]> = []
        const foundSparse = find(obj, (item: any, idx: number) => {
          seen.push([idx, item])
          return false
        })
        expect(foundSparse).toBe(undefined)
        expect(seen).toEqual([
          [0, 1],
          [1, undefined],
          [2, undefined],
        ])
      })

      it('works with a sparse array-like object', () => {
        const obj = { 0: 1, 2: undefined, length: 3.2 }
        const seen: Array<[number, any]> = []
        const foundSparse = find(obj, (item: any, idx: number) => {
          seen.push([idx, item])
          return false
        })
        expect(foundSparse).toBe(undefined)
        expect(seen).toEqual([
          [0, 1],
          [1, undefined],
          [2, undefined],
        ])
      })
    },
  )
})
