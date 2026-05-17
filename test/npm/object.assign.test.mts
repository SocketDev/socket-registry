/**
 * @fileoverview Tests for object.assign NPM package override.
 * Simplified from upstream v4.1.7 (c64df7ab):
 * https://github.com/ljharb/object.assign/blob/c64df7abffac60f4f345a7406d3fb4556d254251/test/tests.js
 */

import { describe, expect, it } from 'vitest'

import { setupNpmPackageTest } from '../util/npm-package-helper.mts'

const {
  eco,
  module: assign,
  skip,
  sockRegPkgName,
} = await setupNpmPackageTest(import.meta.url)

describe(`${eco} > ${sockRegPkgName}`, { skip }, () => {
  it('error cases', () => {
    expect(() => assign(undefined)).toThrow(TypeError)
    expect(() => assign(undefined)).toThrow(TypeError)
  })

  it('non-object sources', () => {
    expect(assign({ a: 1 }, undefined, { b: 2 })).toEqual({ a: 1, b: 2 })
    expect(assign({ a: 1 }, { b: 2 }, undefined)).toEqual({ a: 1, b: 2 })
  })

  it('returns the modified target object', () => {
    const target = {}
    const returned = assign(target, { a: 1 })
    expect(returned).toBe(target)
  })

  it('has the right length', () => {
    expect(assign.length).toBe(2)
  })

  it('merges two objects', () => {
    expect(assign({ a: 1 }, { b: 2 })).toEqual({ a: 1, b: 2 })
  })

  it('later sources override earlier', () => {
    expect(assign({ a: 1 }, { a: 2 })).toEqual({ a: 2 })
  })

  it('multiple sources', () => {
    expect(assign({}, { a: 1 }, { b: 2 }, { c: 3 })).toEqual({
      a: 1,
      b: 2,
      c: 3,
    })
  })
})
