/**
 * @fileoverview Tests for array.prototype.filter NPM package override.
 * Ported 1:1 from upstream v1.0.4 (28594fd0b9640eb92bf62598265ed4c4dcbbb32e):
 * https://github.com/es-shims/Array.prototype.filter/blob/28594fd0b9640eb92bf62598265ed4c4dcbbb32e/test/tests.js
 */

import { describe, expect, it } from 'vitest'

import { setupNpmPackageTest } from '../utils/npm-package-helper.mts'

const {
  eco,
  module: filter,
  skip,
  sockRegPkgName,
} = await setupNpmPackageTest(import.meta.url)

const truthy = () => true
const oddIndexes = (_x: any, i: number) => i % 2 !== 0

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
  const arr: any[] = [
    2,
    3,
    4,
    undefinedIfNoSparseBug,
    true,
    'hej',
    null,
    false,
    0,
  ]
  delete arr[1]
  return arr
}

describe(`${eco} > ${sockRegPkgName}`, { skip }, () => {
  it('throws when a non-function is provided', () => {
    const nonFunctions = [
      undefined,
      null,
      true,
      false,
      0,
      42,
      NaN,
      Infinity,
      '',
      'foo',
      [],
      {},
      /a/g,
    ]
    for (const nonFunction of nonFunctions) {
      expect(() => filter([], nonFunction)).toThrow(TypeError)
    }
  })

  it('does not change the array it is called on', () => {
    const arr = getTestArr()
    const copy = getTestArr()
    filter(arr, truthy)
    expect(arr).toEqual(copy)

    const arrayLike = createArrayLikeFromArray(arr)
    filter(arrayLike, truthy)
    expect(arrayLike).toEqual(createArrayLikeFromArray(copy))
  })

  it('properly filters according to the callback', () => {
    const expected = [undefinedIfNoSparseBug, 'hej', false]

    const result = filter(getTestArr(), oddIndexes)
    expect(result).toEqual(expected)

    const arrayLikeResult = filter(
      createArrayLikeFromArray(getTestArr()),
      oddIndexes,
    )
    expect(arrayLikeResult).toEqual(expected)
  })

  it('skips non-existing values', () => {
    const array = [1, 2, 3, 4]
    const arrayLike = createArrayLikeFromArray([1, 2, 3, 4])
    delete (array as any)[2]
    delete arrayLike[2]

    let i = 0
    filter(array, () => {
      i += 1
    })
    expect(i).toBe(3)

    i = 0
    filter(arrayLike, () => {
      i += 1
    })
    expect(i).toBe(3)
  })

  it('passes the correct values to the callback', () => {
    const expectedValue = {}
    const arr = [expectedValue]
    const context = {}
    filter(
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
    filter(arr, (a: number) => {
      i += 1
      arr.push(a + 3)
    })
    expect(arr).toEqual([1, 2, 3, 4, 5, 6])
    expect(i).toBe(3)

    const arrayLike: Record<string, any> = createArrayLikeFromArray([1, 2, 3])
    i = 0
    filter(arrayLike, (a: number) => {
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
    filter(arr, (x: any, i: number) => {
      actual.push([i, x])
      delete arr[1]
    })
    expect(actual).toEqual([
      [0, 1],
      [2, 3],
    ])
  })

  it('sets the right context when given none (sloppy mode)', () => {
    let context: any
    filter([1], function (this: any) {
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      context = this
    })
    expect(context).toBe(globalThis)
  })

  describe('empty array', () => {
    it('returns a new empty array', () => {
      const arr: any[] = []
      const actual = filter(arr, truthy)
      expect(actual).not.toBe(arr)
      expect(actual).toEqual(arr)
    })
  })

  it('list arg boxing', () => {
    let called = false
    filter('f', (item: string, _index: number, list: any) => {
      expect(item).toBe('f')
      expect(typeof list).toBe('object')
      expect(Object.prototype.toString.call(list)).toBe('[object String]')
      called = true
    })
    expect(called).toBe(true)
  })
})
