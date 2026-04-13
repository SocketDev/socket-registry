/**
 * @fileoverview Tests for array.prototype.findlastindex NPM package override.
 * Ported 1:1 from upstream v1.2.6 (e037a525a28d6694481a76db2e8719542b7505e2):
 * https://github.com/es-shims/Array.prototype.findLastIndex/blob/e037a525a28d6694481a76db2e8719542b7505e2/test/tests.js
 */

import { describe, expect, it } from 'vitest'

import { setupNpmPackageTest } from '../utils/npm-package-helper.mts'

const {
  eco,
  module: findLastIndex,
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
  const arr: any[] = [0, false, null, 'hej', true, undefinedIfNoSparseBug, 3, 2]
  delete arr[6]
  return arr
}

describe(`${eco} > ${sockRegPkgName}`, { skip }, () => {
  it('throws on a non-callable predicate', () => {
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
      expect(() => findLastIndex([], nonFunction)).toThrow(TypeError)
    }
  })

  it('passes the correct values to the callback', () => {
    const expectedValue = {}
    const arr = [expectedValue]
    const context = {}
    findLastIndex(
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
    findLastIndex(arr, (a: number) => {
      i += 1
      arr.push(a + 3)
      return i > 3
    })
    expect(arr).toEqual([1, 2, 3, 6, 5, 4])
    expect(i).toBe(3)
  })

  it('does not visit elements deleted from the array after it has begun', () => {
    const arr = [1, 2, 3]
    const actual: Array<[number, any]> = []
    findLastIndex(arr, (x: any, i: number) => {
      actual.push([i, x])
      delete arr[1]
      return false
    })
    expect(actual).toEqual([
      [2, 3],
      [1, undefined],
      [0, 1],
    ])
  })

  describe('empty array', () => {
    it('true thunk callback yields -1', () => {
      expect(findLastIndex([], trueThunk)).toBe(-1)
    })

    it('false thunk callback yields -1', () => {
      expect(findLastIndex([], falseThunk)).toBe(-1)
    })

    it('counter is not incremented', () => {
      let counter = 0
      findLastIndex([], () => {
        counter += 1
      })
      expect(counter).toBe(0)
    })
  })

  it('returns last index if findLastIndex callback returns true', () => {
    expect(findLastIndex([1, 2, 3], trueThunk)).toBe(2)
  })

  it('returns -1 if no callback returns true', () => {
    expect(findLastIndex([1, 2, 3], falseThunk)).toBe(-1)
  })

  describe('stopping after N elements', () => {
    it('no context', () => {
      const actual: Record<number, any> = {}
      let count = 0
      findLastIndex(getTestArr(), (obj: any, index: number) => {
        actual[index] = obj
        count += 1
        return count === 4
      })
      expect(actual).toEqual({
        4: true,
        5: undefinedIfNoSparseBug,
        6: undefined,
        7: 2,
      })
    })

    it('with context', () => {
      const actual: Record<number, any> = {}
      const context = { actual }
      let count = 0
      findLastIndex(
        getTestArr(),
        function (this: any, obj: any, index: number) {
          this.actual[index] = obj
          count += 1
          return count === 4
        },
        context,
      )
      expect(actual).toEqual({
        4: true,
        5: undefinedIfNoSparseBug,
        6: undefined,
        7: 2,
      })
    })

    it('arraylike, no context', () => {
      const actual: Record<number, any> = {}
      let count = 0
      findLastIndex(
        createArrayLikeFromArray(getTestArr()),
        (obj: any, index: number) => {
          actual[index] = obj
          count += 1
          return count === 4
        },
      )
      expect(actual).toEqual({
        4: true,
        5: undefinedIfNoSparseBug,
        6: undefined,
        7: 2,
      })
    })

    it('arraylike, context', () => {
      const actual: Record<number, any> = {}
      const context = { actual }
      let count = 0
      findLastIndex(
        createArrayLikeFromArray(getTestArr()),
        function (this: any, obj: any, index: number) {
          this.actual[index] = obj
          count += 1
          return count === 4
        },
        context,
      )
      expect(actual).toEqual({
        4: true,
        5: undefinedIfNoSparseBug,
        6: undefined,
        7: 2,
      })
    })
  })

  it('list arg boxing', () => {
    let called = false
    findLastIndex('bar', (item: string, _index: number, list: any) => {
      expect(item).toBe('r')
      expect(typeof list).toBe('object')
      expect(Object.prototype.toString.call(list)).toBe('[object String]')
      called = true
      return true
    })
    expect(called).toBe(true)
  })

  describe('array altered during loop', () => {
    it('handles splice during iteration', () => {
      const arr = ['Shoes', 'Car', 'Bike']
      const results: string[] = []

      findLastIndex(arr, (kValue: string) => {
        if (results.length === 0) {
          arr.splice(1, 1)
        }
        results.push(kValue)
      })

      expect(results.length).toBe(3)
      expect(results).toEqual(['Bike', 'Bike', 'Shoes'])
    })

    it('handles push during iteration', () => {
      const arr = ['Skateboard', 'Barefoot']
      const results: string[] = []

      findLastIndex(arr, (kValue: string) => {
        if (results.length === 0) {
          arr.push('Motorcycle')
          arr[0] = 'Magic Carpet'
        }
        results.push(kValue)
      })

      expect(results.length).toBe(2)
      expect(results).toEqual(['Barefoot', 'Magic Carpet'])
    })
  })

  it('maximum index', () => {
    const arrayLike = { length: Number.MAX_VALUE }
    const calledWithIndex: number[] = []

    findLastIndex(arrayLike, (_: any, index: number) => {
      calledWithIndex.push(index)
      return true
    })

    expect(calledWithIndex).toEqual([Number.MAX_SAFE_INTEGER - 1])
  })
})
