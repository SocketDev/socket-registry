/**
 * @file Collection and primitive equality tests for the deep-equal package
 *   override — equal/Maps/Sets/non-objects/infinities/Dates/buffers. The
 *   type-specific cases (arrays, prototypes, boxed primitives, TypedArrays, …)
 *   live in deep-equal-types.test.mts; both bind to the `deep-equal` override.
 *   Tests ported from
 *   https://github.com/inspect-js/node-deep-equal/blob/48d3bb5b7fe3e65fd564b737c69a9411eb40bc65/test/cmp.js.
 */

import { describe, expect, it } from 'vitest'

import { expectValidPackageStructure } from '../util/assertion-helpers.mts'
import { setupNpmPackageTest } from '../util/npm-package-helper.mts'

const {
  eco,
  module: deepEqual,
  pkgPath,
  skip,
  sockRegPkgName,
} = setupNpmPackageTest(import.meta.url)

// deep-equal package tests may have issues with test dependencies.
describe(`${eco} > ${sockRegPkgName}`, { skip }, () => {
  it('should have valid package structure', () => {
    expectValidPackageStructure(pkgPath, deepEqual, 'function')
  })

  describe('equal', () => {
    it('two equal objects', () => {
      const obj1 = { a: [2, 3], b: [4] }
      const obj2 = { a: [2, 3], b: [4] }
      expect(deepEqual(obj1, obj2)).toBe(true)
      expect(deepEqual(obj1, obj2, { strict: true })).toBe(true)
    })

    it('two equal objects, in different order', () => {
      const obj1 = { a: [2, 3], b: [4] }
      const obj2 = { b: [4], a: [2, 3] }
      expect(deepEqual(obj1, obj2)).toBe(true)
      expect(deepEqual(obj1, obj2, { strict: true })).toBe(true)
    })

    it('two loosely equal, strictly inequal objects', () => {
      const obj1 = { a: 2, b: '4' }
      const obj2 = { a: 2, b: 4 }
      expect(deepEqual(obj1, obj2)).toBe(true)
      expect(deepEqual(obj1, obj2, { strict: true })).toBe(false)
    })

    it('two inequal objects', () => {
      const obj1 = { a: 2, b: 4 }
      const obj2 = { a: 2, B: 4 }
      expect(deepEqual(obj1, obj2)).toBe(false)
      expect(deepEqual(obj1, obj2, { strict: true })).toBe(false)
    })

    it('false and "-000"', () => {
      expect(deepEqual('-000', false)).toBe(true)
      expect(deepEqual('-000', false, { strict: true })).toBe(false)
    })
  })

  describe('Maps', () => {
    it('two equal Maps', () => {
      const map1 = new Map([
        ['a', 1],
        ['b', 2],
      ])
      const map2 = new Map([
        ['b', 2],
        ['a', 1],
      ])
      expect(deepEqual(map1, map2)).toBe(true)
      expect(deepEqual(map1, map2, { strict: true })).toBe(true)
    })

    it('two Maps with inequal values on the same key', () => {
      const map1 = new Map([['a', [1, 2]]])
      const map2 = new Map([['a', [2, 1]]])
      expect(deepEqual(map1, map2)).toBe(false)
      expect(deepEqual(map1, map2, { strict: true })).toBe(false)
    })

    it('two inequal Maps', () => {
      const map1 = new Map([['a', 1]])
      const map2 = new Map([['b', 1]])
      expect(deepEqual(map1, map2)).toBe(false)
      expect(deepEqual(map1, map2, { strict: true })).toBe(false)
    })

    it('two equal Maps in different orders with object keys', () => {
      const map1 = new Map([
        [{}, 3],
        [{}, 2],
        [{}, 1],
      ])
      const map2 = new Map([
        [{}, 1],
        [{}, 2],
        [{}, 3],
      ])
      expect(deepEqual(map1, map2)).toBe(true)
      expect(deepEqual(map1, map2, { strict: true })).toBe(true)
    })

    it('undefined keys, nullish values', () => {
      const map1 = new Map([[undefined, undefined]])
      const map2 = new Map([[undefined, undefined]])
      expect(deepEqual(map1, map2)).toBe(true)
      expect(deepEqual(map1, map2, { strict: true })).toBe(true)
    })

    it('nullish keys', () => {
      const map1 = new Map([[undefined, 3]])
      const map2 = new Map([[undefined, 3]])
      expect(deepEqual(map1, map2)).toBe(true)
      expect(deepEqual(map1, map2, { strict: true })).toBe(true)
    })
  })

  describe('Sets', () => {
    it('two equal Sets', () => {
      const set1 = new Set([1, 2, 3])
      const set2 = new Set([1, 2, 3])
      expect(deepEqual(set1, set2)).toBe(true)
      expect(deepEqual(set1, set2, { strict: true })).toBe(true)
    })

    it('two inequal Sets', () => {
      const set1 = new Set([1, 2, 3])
      const set2 = new Set([1, 2, 4])
      expect(deepEqual(set1, set2)).toBe(false)
      expect(deepEqual(set1, set2, { strict: true })).toBe(false)
    })

    it('two equal Sets with object values', () => {
      // oxlint-disable-next-line socket/sort-set-args -- three identical {} literals; ordering is meaningless and intentional test data.
      const set1 = new Set([{}, {}, {}])
      // oxlint-disable-next-line socket/sort-set-args -- three identical {} literals; ordering is meaningless and intentional test data.
      const set2 = new Set([{}, {}, {}])
      expect(deepEqual(set1, set2)).toBe(true)
      expect(deepEqual(set1, set2, { strict: true })).toBe(true)
    })
  })

  describe('non-objects', () => {
    it('primitives', () => {
      expect(deepEqual(3, 3)).toBe(true)
      expect(deepEqual(3, 3, { strict: true })).toBe(true)
      expect(deepEqual('beep', 'beep')).toBe(true)
      expect(deepEqual('beep', 'beep', { strict: true })).toBe(true)
      expect(deepEqual('3', 3)).toBe(true)
      expect(deepEqual('3', 3, { strict: true })).toBe(false)
      expect(deepEqual('3', [3])).toBe(false)
      expect(deepEqual('3', [3], { strict: true })).toBe(false)
    })
  })

  describe('infinities', () => {
    it('positive and negative infinity', () => {
      expect(
        deepEqual(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY),
      ).toBe(true)
      expect(
        deepEqual(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, {
          strict: true,
        }),
      ).toBe(true)
      expect(
        deepEqual(Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY),
      ).toBe(true)
      expect(
        deepEqual(Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, {
          strict: true,
        }),
      ).toBe(true)
      expect(
        deepEqual(Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY),
      ).toBe(false)
      expect(
        deepEqual(Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, {
          strict: true,
        }),
      ).toBe(false)
    })
  })

  describe('Dates', () => {
    it('equal Dates', () => {
      const date1 = new Date(2000, 1, 1)
      const date2 = new Date(2000, 1, 1)
      expect(deepEqual(date1, date2)).toBe(true)
      expect(deepEqual(date1, date2, { strict: true })).toBe(true)
    })

    it('inequal Dates', () => {
      const date1 = new Date(2000, 1, 1)
      const date2 = new Date(2000, 1, 2)
      expect(deepEqual(date1, date2)).toBe(false)
      expect(deepEqual(date1, date2, { strict: true })).toBe(false)
    })

    it('Date and timestamp', () => {
      const date = new Date(2000, 1, 1)
      const timestamp = date.getTime()
      expect(deepEqual(date, timestamp)).toBe(false)
      expect(deepEqual(date, timestamp, { strict: true })).toBe(false)
    })
  })

  describe('buffers', () => {
    it('equal buffers', () => {
      if (typeof Buffer !== 'function') {
        return
      }

      const buf1 = Buffer.from('test')
      const buf2 = Buffer.from('test')
      expect(deepEqual(buf1, buf2)).toBe(true)
      expect(deepEqual(buf1, buf2, { strict: true })).toBe(true)
    })

    it('inequal buffers', () => {
      if (typeof Buffer !== 'function') {
        return
      }

      const buf1 = Buffer.from('test')
      const buf2 = Buffer.from('tset')
      expect(deepEqual(buf1, buf2)).toBe(false)
      expect(deepEqual(buf1, buf2, { strict: true })).toBe(false)
    })

    it('buffer and Uint8Array with same contents', () => {
      if (typeof Buffer !== 'function') {
        return
      }

      const buf = Buffer.from([1, 2, 3, 4])
      const arr = new Uint8Array([1, 2, 3, 4])
      expect(deepEqual(buf, arr)).toBe(true)
      expect(deepEqual(buf, arr, { strict: true })).toBe(false)
    })
  })
})
