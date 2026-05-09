/**
 * @fileoverview Tests for array.prototype.every NPM package override.
 * Ported 1:1 from upstream v1.1.7 (2630e8d13ff85946c3e8ed194d9edf04c3d62dd5):
 * https://github.com/es-shims/Array.prototype.every/blob/2630e8d13ff85946c3e8ed194d9edf04c3d62dd5/test/tests.js
 */

import { describe, expect, it } from 'vitest'

import { setupNpmPackageTest } from '../utils/npm-package-helper.mts'

const {
  eco,
  module: every,
  skip,
  sockRegPkgName,
} = await setupNpmPackageTest(import.meta.url)

const trueThunk = () => true
const falseThunk = () => false

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
    undefinedIfNoSparseBug,
    true,
    'hej',
    undefined,
    false,
    0,
  ]
  delete arr[1]
  return arr
}

describe(`${eco} > ${sockRegPkgName}`, { skip }, () => {
  it('passes the correct values to the callback', () => {
    const expectedValue = {}
    const arr = [expectedValue]
    const context = {}
    every(
      arr,
      function (this: any, value: any, key: number, list: any[]) {
        expect(arguments.length).toBe(3)
        expect(value).toBe(expectedValue)
        expect(key).toBe(0)
        expect(list).toBe(arr)
        expect(this).toBe(context)
        return true
      },
      context,
    )
  })

  it('does not visit elements added to the array after it has begun', () => {
    const arr = [1, 2, 3]
    let i = 0
    every(arr, (a: number) => {
      i += 1
      arr.push(a + 3)
      return i <= 3
    })
    expect(arr).toEqual([1, 2, 3, 4, 5, 6])
    expect(i).toBe(3)
  })

  it('does not visit elements deleted from the array after it has begun', () => {
    const arr = [1, 2, 3]
    const actual: Array<[number, any]> = []
    every(arr, (x: any, i: number) => {
      actual.push([i, x])
      delete arr[1]
      return true
    })
    expect(actual).toEqual([
      [0, 1],
      [2, 3],
    ])
  })

  describe('empty array', () => {
    it('true thunk callback yields true', () => {
      expect(every([], trueThunk)).toBe(true)
    })

    it('false thunk callback yields true', () => {
      expect(every([], falseThunk)).toBe(true)
    })
  })

  it('returns true if every callback returns true', () => {
    expect(every([1, 2, 3], trueThunk)).toBe(true)
  })

  it('returns false if any callback returns false', () => {
    expect(every([1, 2, 3], falseThunk)).toBe(false)
  })

  describe('stopping after N elements', () => {
    it('no context', () => {
      const actual: Record<number, any> = {}
      let count = 0
      every(getTestArr(), (obj: any, index: number) => {
        actual[index] = obj
        count += 1
        return count !== 3
      })
      expect(actual).toEqual({
        0: 2,
        2: undefinedIfNoSparseBug,
        3: true,
      })
    })

    it('with context', () => {
      const actual: Record<number, any> = {}
      const context = { actual }
      let count = 0
      every(
        getTestArr(),
        function (this: any, obj: any, index: number) {
          this.actual[index] = obj
          count += 1
          return count !== 3
        },
        context,
      )
      expect(actual).toEqual({
        0: 2,
        2: undefinedIfNoSparseBug,
        3: true,
      })
    })

    it('arraylike, no context', () => {
      const actual: Record<number, any> = {}
      let count = 0
      every(
        createArrayLikeFromArray(getTestArr()),
        (obj: any, index: number) => {
          actual[index] = obj
          count += 1
          return count !== 3
        },
      )
      expect(actual).toEqual({
        0: 2,
        2: undefinedIfNoSparseBug,
        3: true,
      })
    })

    it('arraylike, context', () => {
      const actual: Record<number, any> = {}
      const context = { actual }
      let count = 0
      every(
        createArrayLikeFromArray(getTestArr()),
        function (this: any, obj: any, index: number) {
          this.actual[index] = obj
          count += 1
          return count !== 3
        },
        context,
      )
      expect(actual).toEqual({
        0: 2,
        2: undefinedIfNoSparseBug,
        3: true,
      })
    })
  })

  it('list arg boxing', () => {
    let called = false
    every('foo', (item: string, _index: number, list: any) => {
      expect(item).toBe('f')
      expect(typeof list).toBe('object')
      expect(Object.prototype.toString.call(list)).toBe('[object String]')
      called = true
      return false
    })
    expect(called).toBe(true)
  })
})
