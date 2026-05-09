/**
 * @fileoverview Tests for set-function-length NPM package override.
 * Ported 1:1 from upstream v1.2.2 (2290d3ea):
 * https://github.com/ljharb/set-function-length/blob/2290d3ea/test/index.js
 */
import { describe, expect, it } from 'vitest'

import { setupNpmPackageTest } from '../utils/npm-package-helper.mts'

const {
  eco,
  module: setFunctionLength,
  skip,
  sockRegPkgName,
} = await setupNpmPackageTest(import.meta.url)

describe(`${eco} > ${sockRegPkgName}`, { skip }, () => {
  it('throws on non-functions', () => {
    const nonFunctions = [
      undefined,
      undefined,
      true,
      false,
      0,
      42,
      '',
      'foo',
      /a/g,
      [],
      {},
    ]
    for (const nonFn of nonFunctions) {
      expect(() => setFunctionLength(nonFn)).toThrow(TypeError)
    }
  })

  it('throws on non-integer lengths', () => {
    const nonIntegers = [
      undefined,
      undefined,
      true,
      false,
      '',
      'foo',
      /a/g,
      [],
      {},
      1.5,
      0xffffffff + 1,
    ]
    for (const nonInt of nonIntegers) {
      expect(() => setFunctionLength(function () {}, nonInt)).toThrow(TypeError)
    }
  })

  it('sets the length of a function', () => {
    const fns = [
      function zero() {},
      function one(_x: any) {},
      function two(_x: any, _y: any) {},
    ]
    for (const fn of fns) {
      const origLength = fn.length
      const newLength = origLength * 2 + 12
      expect(setFunctionLength(fn, newLength)).toBe(fn)
      expect(fn.length).toBe(newLength)
    }
  })

  it('sets the length loosely', () => {
    const fn = function zero() {}
    expect(setFunctionLength(fn, 42, true)).toBe(fn)
    expect(fn.length).toBe(42)
  })
})
