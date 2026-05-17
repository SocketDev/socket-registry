/**
 * @fileoverview Tests for reflect.getprototypeof NPM package override.
 * Ported 1:1 from upstream v1.0.10 (00db5482):
 * https://github.com/es-shims/Reflect.getPrototypeOf/blob/00db548275a0c1bb078d31679c3f4a0fc0ccdf58/test/tests.js
 */

import { describe, expect, it } from 'vitest'

import { setupNpmPackageTest } from '../util/npm-package-helper.mts'

const {
  eco,
  module: getPrototypeOf,
  skip,
  sockRegPkgName,
} = await setupNpmPackageTest(import.meta.url)

describe(`${eco} > ${sockRegPkgName}`, { skip }, () => {
  it('throws for undefined', () => {
    expect(() => getPrototypeOf(undefined)).toThrow(TypeError)
  })

  it('throws for null', () => {
    // oxlint-disable-next-line socket/prefer-undefined-over-null -- spec test: Reflect.getPrototypeOf(null) throws TypeError per ToObject(null).
    expect(() => getPrototypeOf(null)).toThrow(TypeError)
  })

  it('throws for primitives', () => {
    expect(() => getPrototypeOf(true)).toThrow()
    expect(() => getPrototypeOf(false)).toThrow()
    expect(() => getPrototypeOf(42)).toThrow()
    expect(() => getPrototypeOf(NaN)).toThrow()
    expect(() => getPrototypeOf(0)).toThrow()
    expect(() => getPrototypeOf(-0)).toThrow()
    expect(() => getPrototypeOf(Infinity)).toThrow()
    expect(() => getPrototypeOf(-Infinity)).toThrow()
    expect(() => getPrototypeOf('')).toThrow()
    expect(() => getPrototypeOf('foo')).toThrow()
  })

  it('returns correct prototypes for objects', () => {
    expect(getPrototypeOf(/a/g)).toBe(RegExp.prototype)
    expect(getPrototypeOf(new Date())).toBe(Date.prototype)
    expect(getPrototypeOf(function () {})).toBe(Function.prototype)
    expect(getPrototypeOf([])).toBe(Array.prototype)
    expect(getPrototypeOf({})).toBe(Object.prototype)
  })

  it('handles null prototype objects', () => {
    const obj = { __proto__: null }
    if ('toString' in obj) {
      expect(getPrototypeOf(obj)).toBe(Object.prototype)
    } else {
      // oxlint-disable-next-line socket/prefer-undefined-over-null -- spec: getPrototypeOf({__proto__: null}) returns null, not undefined.
      expect(getPrototypeOf(obj)).toBe(null)
    }
  })
})
