/**
 * @fileoverview Tests for es-get-iterator NPM package override.
 * Simplified from upstream v1.1.3 (683c7aad):
 * https://github.com/ljharb/es-get-iterator/blob/683c7aad2e941d18e8de3cc537d91f1301f07ee6/test/index.js
 */

import { describe, expect, it } from 'vitest'

import { setupNpmPackageTest } from '../util/npm-package-helper.mts'

const {
  eco,
  module: getIterator,
  skip,
  sockRegPkgName,
} = await setupNpmPackageTest(import.meta.url)

describe(`${eco} > ${sockRegPkgName}`, { skip }, () => {
  it('strings', () => {
    const iter = getIterator('foo')
    expect(iter.next()).toEqual({ value: 'f', done: false })
    expect(iter.next()).toEqual({ value: 'o', done: false })
    expect(iter.next()).toEqual({ value: 'o', done: false })
    expect(iter.next().done).toBe(true)
  })

  it('arrays', () => {
    const iter = getIterator([1, 2, 3])
    expect(iter.next()).toEqual({ value: 1, done: false })
    expect(iter.next()).toEqual({ value: 2, done: false })
    expect(iter.next()).toEqual({ value: 3, done: false })
    expect(iter.next().done).toBe(true)
  })

  it('non-iterables return undefined', () => {
    expect(getIterator(42)).toBeUndefined()
    expect(getIterator(true)).toBeUndefined()
    expect(getIterator(undefined)).toBeUndefined()
    expect(getIterator(undefined)).toBeUndefined()
  })

  it('Map', () => {
    const map = new Map([
      ['a', 1],
      ['b', 2],
    ])
    const iter = getIterator(map)
    expect(iter.next()).toEqual({ value: ['a', 1], done: false })
    expect(iter.next()).toEqual({ value: ['b', 2], done: false })
    expect(iter.next().done).toBe(true)
  })

  it('Set', () => {
    const set = new Set([1, 2, 3])
    const iter = getIterator(set)
    expect(iter.next()).toEqual({ value: 1, done: false })
    expect(iter.next()).toEqual({ value: 2, done: false })
    expect(iter.next()).toEqual({ value: 3, done: false })
    expect(iter.next().done).toBe(true)
  })
})
