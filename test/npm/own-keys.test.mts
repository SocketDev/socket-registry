/**
 * @file Tests for own-keys NPM package override. Ported 1:1 from upstream
 *   v1.0.2 (20620ebf):
 *   https://github.com/ljharb/own-keys/blob/20620ebfd195d384d85fc134e29cc4916297a92f/test/index.js.
 */

import { describe, expect, it } from 'vitest'

import { setupNpmPackageTest } from '../util/npm-package-helper.mts'

const {
  eco,
  module: ownKeys,
  skip,
  sockRegPkgName,
} = setupNpmPackageTest(import.meta.url)

function comparator(a: PropertyKey, b: PropertyKey): number {
  if (typeof a === 'string' && typeof b === 'string') {
    return a.localeCompare(b)
  }
  if (typeof a === 'number' && typeof b === 'number') {
    return a - b
  }
  return typeof a === 'symbol' ? 1 : -1
}

describe(`${eco} > ${sockRegPkgName}`, { skip }, () => {
  it('is a function with a length of 1', () => {
    expect(typeof ownKeys).toBe('function')
    expect(ownKeys.length).toBe(1)
  })

  it('includes non-enumerable properties', () => {
    const obj: Record<string, number> = { a: 1, b: 2 }
    Object.defineProperty(obj, 'c', {
      configurable: true,
      enumerable: false,
      writable: true,
      value: 3,
    })
    expect(ownKeys(obj).toSorted(comparator)).toEqual(
      ['a', 'b', 'c'].toSorted(comparator),
    )
  })

  it('works with symbols, both enum and non-enum', () => {
    const obj: Record<PropertyKey, number> = { a: 1 }
    const sym = Symbol('b')
    obj[sym] = 2
    const nonEnumSym = Symbol('c')
    Object.defineProperty(obj, nonEnumSym, {
      configurable: true,
      enumerable: false,
      writable: true,
      value: 3,
    })
    expect(ownKeys(obj).toSorted(comparator)).toEqual(
      ['a', sym, nonEnumSym].toSorted(comparator),
    )
  })

  it('preserves insertion order of enumerable string keys', () => {
    expect(ownKeys({ d: 1, a: 2, c: 3, b: 4 })).toEqual(['d', 'a', 'c', 'b'])
  })
})
