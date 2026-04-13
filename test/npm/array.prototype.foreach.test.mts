/**
 * @fileoverview Tests for array.prototype.foreach NPM package override.
 * Ported 1:1 from upstream v1.0.7 (221db09c351c56fd4c9172e40391f601cf6b8d8a):
 * https://github.com/es-shims/Array.prototype.forEach/blob/221db09c351c56fd4c9172e40391f601cf6b8d8a/test/tests.js
 */

import { describe, expect, it } from 'vitest'

import { setupNpmPackageTest } from '../utils/npm-package-helper.mts'

const {
  eco,
  module: forEach,
  skip,
  sockRegPkgName,
} = await setupNpmPackageTest(import.meta.url)

const identity = (x: any) => x
const arrayWrap = (x: any) => [x]

const canDistinguishSparseFromUndefined = 0 in [undefined]
const undefinedIfNoSparseBug = canDistinguishSparseFromUndefined
  ? undefined
  : {
      valueOf() {
        return 0
      },
    }

const createArrayLikeFromArray = (arr: any[]) => {
  const o: Record<string, any> = {}
  for (let i = 0; i < arr.length; i += 1) {
    if (i in arr) {
      o[i] = arr[i]
    }
  }
  o['length'] = arr.length
  return o
}

const getTestArr = () => {
  const arr: any[] = [2, 3, undefinedIfNoSparseBug, true, 'hej', null, false, 0]
  delete arr[1]
  return arr
}

describe(`${eco} > ${sockRegPkgName}`, { skip }, () => {
  it('does not change the array it is called on', () => {
    const arr = getTestArr()
    const copy = getTestArr()
    forEach(arr, arrayWrap)
    expect(arr).toEqual(copy)

    const arrayLike = createArrayLikeFromArray(arr)
    forEach(arrayLike, arrayWrap)
    expect(arrayLike).toEqual(createArrayLikeFromArray(copy))
  })

  it('skips non-existing values', () => {
    const array = [1, 2, 3, 4]
    const arrayLike = createArrayLikeFromArray([1, 2, 3, 4])
    delete (array as any)[2]
    delete arrayLike[2]

    let i = 0
    forEach(array, () => {
      i += 1
    })
    expect(i).toBe(3)

    i = 0
    forEach(arrayLike, () => {
      i += 1
    })
    expect(i).toBe(3)
  })

  it('passes the correct values to the callback', () => {
    const expectedValue = {}
    const arr = [expectedValue]
    const context = {}
    forEach(
      arr,
      function (this: any, value: any, key: number, list: any[]) {
        expect(arguments.length).toBe(3)
        expect(value).toBe(expectedValue)
        expect(key).toBe(0)
        expect(list).toBe(arr)
        expect(this).toBe(context)
      },
      context,
    )
  })

  it('does not visit elements added to the array after it has begun', () => {
    const arr = [1, 2, 3]
    let i = 0
    forEach(arr, (a: number) => {
      i += 1
      arr.push(a + 3)
    })
    expect(arr).toEqual([1, 2, 3, 4, 5, 6])
    expect(i).toBe(3)

    const arrayLike: Record<string, any> = createArrayLikeFromArray([1, 2, 3])
    i = 0
    forEach(arrayLike, (a: number) => {
      i += 1
      arrayLike[arrayLike['length']] = a + 3
      arrayLike['length'] += 1
    })
    expect(Array.prototype.slice.call(arrayLike)).toEqual([1, 2, 3, 4, 5, 6])
    expect(i).toBe(3)
  })

  it('does not visit elements deleted from the array after it has begun', () => {
    const arr = [1, 2, 3]
    const actual: Array<[number, any]> = []
    forEach(arr, (x: any, i: number) => {
      actual.push([i, x])
      delete arr[1]
    })
    expect(actual).toEqual([
      [0, 1],
      [2, 3],
    ])
  })

  describe('empty array', () => {
    it('returns undefined', () => {
      const arr: any[] = []
      const actual = forEach(arr, identity)
      expect(actual).toBe(undefined)
    })
  })

  it('list arg boxing', () => {
    let called = false
    forEach('f', (item: string, _index: number, list: any) => {
      expect(item).toBe('f')
      expect(typeof list).toBe('object')
      expect(Object.prototype.toString.call(list)).toBe('[object String]')
      called = true
    })
    expect(called).toBe(true)
  })
})
