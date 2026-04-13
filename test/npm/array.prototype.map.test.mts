/**
 * @fileoverview Tests for array.prototype.map NPM package override.
 * Ported 1:1 from upstream v1.0.8 (3e6c614156e4efa3d0c8007c49712ee64333a314):
 * https://github.com/es-shims/Array.prototype.map/blob/3e6c614156e4efa3d0c8007c49712ee64333a314/test/tests.js
 */

import { describe, expect, it } from 'vitest'

import { setupNpmPackageTest } from '../utils/npm-package-helper.mts'

const {
  eco,
  module: map,
  skip,
  sockRegPkgName,
} = await setupNpmPackageTest(import.meta.url)

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
    map(arr, arrayWrap)
    expect(arr).toEqual(copy)

    const arrayLike = createArrayLikeFromArray(arr)
    map(arrayLike, arrayWrap)
    expect(arrayLike).toEqual(createArrayLikeFromArray(copy))
  })

  it('properly translates the values as according to the callback', () => {
    const expected: any[] = [
      [2],
      [3],
      [undefinedIfNoSparseBug],
      [true],
      ['hej'],
      [null],
      [false],
      [0],
    ]
    delete expected[1]

    const result = map(getTestArr(), arrayWrap)
    expect(result).toEqual(expected)

    const arrayLikeResult = map(
      createArrayLikeFromArray(getTestArr()),
      arrayWrap,
    )
    expect(arrayLikeResult).toEqual(expected)
  })

  it('skips non-existing values', () => {
    const array = [1, 2, 3, 4]
    const arrayLike = createArrayLikeFromArray([1, 2, 3, 4])
    delete (array as any)[2]
    delete arrayLike[2]

    let i = 0
    map(array, () => {
      i += 1
    })
    expect(i).toBe(3)

    i = 0
    map(arrayLike, () => {
      i += 1
    })
    expect(i).toBe(3)
  })

  it('passes the correct values to the callback', () => {
    const expectedValue = {}
    const arr = [expectedValue]
    const context = {}
    map(
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
    map(arr, (a: number) => {
      i += 1
      arr.push(a + 3)
    })
    expect(arr).toEqual([1, 2, 3, 4, 5, 6])
    expect(i).toBe(3)

    const arrayLike: Record<string, any> = createArrayLikeFromArray([1, 2, 3])
    i = 0
    map(arrayLike, (a: number) => {
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
    map(arr, (x: any, i: number) => {
      actual.push([i, x])
      delete arr[1]
    })
    expect(actual).toEqual([
      [0, 1],
      [2, 3],
    ])
  })

  describe('empty array', () => {
    it('returns a new empty array', () => {
      const arr: any[] = []
      const actual = map(arr, (x: any) => x)
      expect(actual).not.toBe(arr)
      expect(actual).toEqual(arr)
    })
  })

  it('list arg boxing', () => {
    let called = false
    map('f', (item: string, _index: number, list: any) => {
      expect(item).toBe('f')
      expect(typeof list).toBe('object')
      expect(Object.prototype.toString.call(list)).toBe('[object String]')
      called = true
    })
    expect(called).toBe(true)
  })
})
