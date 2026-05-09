/**
 * @fileoverview Tests for object.getprototypeof NPM package override.
 * Ported 1:1 from upstream v1.0.7 (9efa3c7f):
 * https://github.com/es-shims/Object.getPrototypeOf/blob/9efa3c7f024b20f065ac420c4fa168ea7c3ce6c6/test/tests.js
 */

import { describe, expect, it } from 'vitest'

import { setupNpmPackageTest } from '../utils/npm-package-helper.mts'

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
    expect(() => getPrototypeOf(undefined)).toThrow(TypeError)
  })

  it('returns Boolean.prototype for booleans', () => {
    expect(getPrototypeOf(true)).toBe(Boolean.prototype)
    expect(getPrototypeOf(false)).toBe(Boolean.prototype)
  })

  it('returns Number.prototype for numbers', () => {
    expect(getPrototypeOf(42)).toBe(Number.prototype)
    expect(getPrototypeOf(NaN)).toBe(Number.prototype)
    expect(getPrototypeOf(0)).toBe(Number.prototype)
    expect(getPrototypeOf(-0)).toBe(Number.prototype)
    expect(getPrototypeOf(Infinity)).toBe(Number.prototype)
    expect(getPrototypeOf(-Infinity)).toBe(Number.prototype)
  })

  it('returns String.prototype for strings', () => {
    expect(getPrototypeOf('')).toBe(String.prototype)
    expect(getPrototypeOf('foo')).toBe(String.prototype)
  })

  it('returns correct prototypes for objects', () => {
    expect(getPrototypeOf(/a/g)).toBe(RegExp.prototype)
    expect(getPrototypeOf(new Date())).toBe(Date.prototype)
    expect(getPrototypeOf(function () {})).toBe(Function.prototype)
    expect(getPrototypeOf([])).toBe(Array.prototype)
    expect(getPrototypeOf({})).toBe(Object.prototype)
  })
})
