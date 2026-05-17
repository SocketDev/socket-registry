/**
 * @fileoverview Tests for array.prototype.reduce NPM package override.
 * Ported 1:1 from upstream v1.0.8 (27597d0bba6159b678f7d44bbc9cef550f294851):
 * https://github.com/es-shims/Array.prototype.reduce/blob/27597d0bba6159b678f7d44bbc9cef550f294851/test/tests.js
 */

import { describe, expect, it } from 'vitest'

import { setupNpmPackageTest } from '../util/npm-package-helper.mts'

const {
  eco,
  module: reduce,
  skip,
  sockRegPkgName,
} = await setupNpmPackageTest(import.meta.url)

const identity = (x: any) => x

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

describe(`${eco} > ${sockRegPkgName}`, { skip }, () => {
  it('passes the correct values to the callback', () => {
    const expectedValue = {}
    const initialValue = {}
    const expectedResult = {}
    const arr = [expectedValue]
    const result = reduce(
      arr,
      function (
        this: any,
        accumulator: any,
        value: any,
        key: number,
        list: any[],
      ) {
        expect(arguments.length).toBe(4)
        expect(accumulator).toBe(initialValue)
        expect(value).toBe(expectedValue)
        expect(key).toBe(0)
        expect(list).toBe(arr)
        expect(this).toBe(undefined)
        return expectedResult
      },
      initialValue,
    )
    expect(result).toBe(expectedResult)
  })

  it('starts with the right initialValue', () => {
    const firstValue = {}
    const secondValue = {}

    reduce([firstValue, secondValue], (accumulator: any, value: any) => {
      expect(accumulator).toBe(firstValue)
      expect(value).toBe(secondValue)
    })

    reduce(
      [secondValue],
      (accumulator: any, value: any) => {
        expect(accumulator).toBe(firstValue)
        expect(value).toBe(secondValue)
      },
      firstValue,
    )
  })

  it('does not visit elements added to the array after it has begun', () => {
    let arr = [1, 2, 3]
    let i = 0
    reduce(arr, (_acc: any, v: number) => {
      i += 1
      arr.push(v + 3)
    })
    expect(arr).toEqual([1, 2, 3, 5, 6])
    expect(i).toBe(2)

    i = 0
    arr = [1, 2, 3]
    reduce(
      arr,
      (_acc: any, v: number) => {
        i += 1
        arr.push(v + 3)
      },
      undefined,
    )
    expect(arr).toEqual([1, 2, 3, 4, 5, 6])
    expect(i).toBe(3)

    let arrayLike = createArrayLikeFromArray([1, 2, 3])
    i = 0
    reduce(arrayLike, (_acc: any, v: number) => {
      i += 1
      arrayLike[arrayLike['length']] = v + 3
      arrayLike['length'] += 1
    })
    expect(Array.prototype.slice.call(arrayLike)).toEqual([1, 2, 3, 5, 6])
    expect(i).toBe(2)

    arrayLike = createArrayLikeFromArray([1, 2, 3])
    i = 0
    reduce(
      arrayLike,
      (_acc: any, v: number) => {
        i += 1
        arrayLike[arrayLike['length']] = v + 3
        arrayLike['length'] += 1
      },
      undefined,
    )
    expect(Array.prototype.slice.call(arrayLike)).toEqual([1, 2, 3, 4, 5, 6])
    expect(i).toBe(3)
  })

  describe('empty array', () => {
    it('returns initialValue', () => {
      const initialValue = {}
      const actual = reduce([], identity, initialValue)
      expect(actual).toBe(initialValue)
    })

    it('throws without initialValue', () => {
      expect(() => reduce([], identity)).toThrow(TypeError)
    })

    it('only-holes array throws without initialValue', () => {
      const sparse = Array(10)
      expect(() => reduce(sparse, identity)).toThrow(TypeError)
    })
  })

  it('skips holes', () => {
    const arr = [1, undefinedIfNoSparseBug, 3]
    const visited: Record<number, boolean> = {}
    reduce(
      arr,
      (a: any, b: any) => {
        if (a) {
          visited[a] = true
        }
        if (b) {
          visited[b] = true
        }
        return 0
      },
      undefined,
    )
    expect(visited).toEqual({ 1: true, 3: true })

    const visited2: Record<number, boolean> = {}
    reduce(arr, (a: any, b: any) => {
      if (a) {
        visited2[a] = true
      }
      if (b) {
        visited2[b] = true
      }
      return 0
    })
    expect(visited2).toEqual({ 1: true, 3: true })
  })

  it('list arg boxing', () => {
    let called = false
    reduce(
      'f',
      (acc: any, item: string, _index: number, list: any) => {
        expect(acc).toBe(undefined)
        expect(item).toBe('f')
        expect(typeof list).toBe('object')
        expect(Object.prototype.toString.call(list)).toBe('[object String]')
        called = true
      },
      undefined,
    )
    expect(called).toBe(true)
  })

  it('test262: 15.4.4.21-3-12', () => {
    const obj = {
      1: 11,
      2: 9,
      length: '-4294967294',
    }

    const cb = (_prevVal: any, curVal: any, idx: number, object: any) => {
      expect(object).toBe(obj)
      return curVal === 11 && idx === 1
    }

    expect(reduce(obj, cb, 1)).toBe(1)
  })
})
