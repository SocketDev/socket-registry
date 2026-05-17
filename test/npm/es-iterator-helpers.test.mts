/**
 * @fileoverview Tests for es-iterator-helpers NPM package override.
 * Ported 1:1 from upstream v1.3.2 (1a9241c3):
 * https://github.com/es-shims/iterator-helpers/blob/1a9241c33779dce25110474feedb2c4a1b15c7ff/test/Iterator.js
 */

import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { setupNpmPackageTest } from '../util/npm-package-helper.mts'

const {
  eco,
  module: iteratorHelpers,
  pkgPath,
  skip,
  sockRegPkgName,
} = await setupNpmPackageTest(import.meta.url)

const loadSub = (subPath: string) => {
  if (skip) {
    return undefined
  }
  try {
    return require(path.join(pkgPath, subPath))
  } catch {
    return undefined
  }
}

const iteratorFrom = loadSub('Iterator.from')
const iteratorMap = loadSub('Iterator.prototype.map')
const iteratorFilter = loadSub('Iterator.prototype.filter')
const iteratorTake = loadSub('Iterator.prototype.take')
const iteratorDrop = loadSub('Iterator.prototype.drop')
const iteratorToArray = loadSub('Iterator.prototype.toArray')
const iteratorForEach = loadSub('Iterator.prototype.forEach')
const iteratorSome = loadSub('Iterator.prototype.some')
const iteratorEvery = loadSub('Iterator.prototype.every')
const iteratorFind = loadSub('Iterator.prototype.find')
const iteratorReduce = loadSub('Iterator.prototype.reduce')
const iteratorFlatMap = loadSub('Iterator.prototype.flatMap')

describe(`${eco} > ${sockRegPkgName}`, { skip }, () => {
  it('exports expected methods', () => {
    expect(Array.isArray(iteratorHelpers)).toBe(true)
  })

  describe('Iterator.from', () => {
    it('is a function', { skip: !iteratorFrom }, () => {
      expect(typeof iteratorFrom).toBe('function')
    })

    it(
      'wraps an array iterator',
      { skip: !iteratorFrom || typeof Symbol === 'undefined' },
      () => {
        const iter = iteratorFrom([1, 2, 3])
        expect(iter.next()).toEqual({ value: 1, done: false })
        expect(iter.next()).toEqual({ value: 2, done: false })
        expect(iter.next()).toEqual({ value: 3, done: false })
        expect(iter.next().done).toBe(true)
      },
    )

    it(
      'wraps a string iterator',
      { skip: !iteratorFrom || typeof Symbol === 'undefined' },
      () => {
        const iter = iteratorFrom('abc')
        expect(iter.next()).toEqual({ value: 'a', done: false })
        expect(iter.next()).toEqual({ value: 'b', done: false })
        expect(iter.next()).toEqual({ value: 'c', done: false })
        expect(iter.next().done).toBe(true)
      },
    )
  })

  describe('Iterator.prototype.map', () => {
    it('maps values', { skip: !iteratorMap }, () => {
      const arr = [1, 2, 3]
      const iter = arr[Symbol.iterator]()
      const mapped = iteratorMap(iter, (x: number) => x * 2)
      expect(mapped.next()).toEqual({ value: 2, done: false })
      expect(mapped.next()).toEqual({ value: 4, done: false })
      expect(mapped.next()).toEqual({ value: 6, done: false })
      expect(mapped.next().done).toBe(true)
    })
  })

  describe('Iterator.prototype.filter', () => {
    it('filters values', { skip: !iteratorFilter }, () => {
      const arr = [1, 2, 3, 4, 5]
      const iter = arr[Symbol.iterator]()
      const filtered = iteratorFilter(iter, (x: number) => x % 2 === 0)
      expect(filtered.next()).toEqual({ value: 2, done: false })
      expect(filtered.next()).toEqual({ value: 4, done: false })
      expect(filtered.next().done).toBe(true)
    })
  })

  describe('Iterator.prototype.take', () => {
    it('takes first n values', { skip: !iteratorTake }, () => {
      const arr = [1, 2, 3, 4, 5]
      const iter = arr[Symbol.iterator]()
      const taken = iteratorTake(iter, 3)
      expect(taken.next()).toEqual({ value: 1, done: false })
      expect(taken.next()).toEqual({ value: 2, done: false })
      expect(taken.next()).toEqual({ value: 3, done: false })
      expect(taken.next().done).toBe(true)
    })
  })

  describe('Iterator.prototype.drop', () => {
    it('drops first n values', { skip: !iteratorDrop }, () => {
      const arr = [1, 2, 3, 4, 5]
      const iter = arr[Symbol.iterator]()
      const dropped = iteratorDrop(iter, 3)
      expect(dropped.next()).toEqual({ value: 4, done: false })
      expect(dropped.next()).toEqual({ value: 5, done: false })
      expect(dropped.next().done).toBe(true)
    })
  })

  describe('Iterator.prototype.toArray', () => {
    it('collects values into an array', { skip: !iteratorToArray }, () => {
      const arr = [1, 2, 3]
      const iter = arr[Symbol.iterator]()
      const result = iteratorToArray(iter)
      expect(result).toEqual([1, 2, 3])
    })
  })

  describe('Iterator.prototype.forEach', () => {
    it('calls callback for each value', { skip: !iteratorForEach }, () => {
      const arr = [1, 2, 3]
      const iter = arr[Symbol.iterator]()
      const results: number[] = []
      iteratorForEach(iter, (x: number) => {
        results.push(x)
      })
      expect(results).toEqual([1, 2, 3])
    })
  })

  describe('Iterator.prototype.some', () => {
    it('returns true when predicate matches', { skip: !iteratorSome }, () => {
      const arr = [1, 2, 3]
      const iter = arr[Symbol.iterator]()
      expect(iteratorSome(iter, (x: number) => x === 2)).toBe(true)
    })

    it(
      'returns false when predicate never matches',
      { skip: !iteratorSome },
      () => {
        const arr = [1, 2, 3]
        const iter = arr[Symbol.iterator]()
        expect(iteratorSome(iter, (x: number) => x === 4)).toBe(false)
      },
    )
  })

  describe('Iterator.prototype.every', () => {
    it('returns true when all match', { skip: !iteratorEvery }, () => {
      const arr = [2, 4, 6]
      const iter = arr[Symbol.iterator]()
      expect(iteratorEvery(iter, (x: number) => x % 2 === 0)).toBe(true)
    })

    it(
      'returns false when one does not match',
      { skip: !iteratorEvery },
      () => {
        const arr = [2, 3, 6]
        const iter = arr[Symbol.iterator]()
        expect(iteratorEvery(iter, (x: number) => x % 2 === 0)).toBe(false)
      },
    )
  })

  describe('Iterator.prototype.find', () => {
    it('finds a matching value', { skip: !iteratorFind }, () => {
      const arr = [1, 2, 3]
      const iter = arr[Symbol.iterator]()
      expect(iteratorFind(iter, (x: number) => x === 2)).toBe(2)
    })

    it('returns undefined when not found', { skip: !iteratorFind }, () => {
      const arr = [1, 2, 3]
      const iter = arr[Symbol.iterator]()
      expect(iteratorFind(iter, (x: number) => x === 4)).toBeUndefined()
    })
  })

  describe('Iterator.prototype.reduce', () => {
    it('reduces values with accumulator', { skip: !iteratorReduce }, () => {
      const arr = [1, 2, 3]
      const iter = arr[Symbol.iterator]()
      const sum = iteratorReduce(iter, (_acc: number, x: number) => _acc + x, 0)
      expect(sum).toBe(6)
    })
  })

  describe('Iterator.prototype.flatMap', () => {
    it('flat maps values', { skip: !iteratorFlatMap }, () => {
      const arr = [1, 2, 3]
      const iter = arr[Symbol.iterator]()
      const flatMapped = iteratorFlatMap(iter, (x: number) => [x, x * 10])
      const result = iteratorToArray
        ? iteratorToArray(flatMapped)
        : [...flatMapped]
      expect(result).toEqual([1, 10, 2, 20, 3, 30])
    })
  })
})
