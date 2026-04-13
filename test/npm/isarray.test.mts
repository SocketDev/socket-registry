/**
 * @fileoverview Tests for isarray NPM package override.
 * Ported 1:1 from upstream v2.0.5 (juliangruber/isarray):
 * https://github.com/juliangruber/isarray/blob/v2.0.5/test.js
 */

import { describe, expect, it } from 'vitest'

import { setupNpmPackageTest } from '../utils/npm-package-helper.mts'

const {
  eco,
  module: isArray,
  skip,
  sockRegPkgName,
} = await setupNpmPackageTest(import.meta.url)

describe(`${eco} > ${sockRegPkgName}`, { skip }, () => {
  it('[] is an array', () => {
    expect(isArray([])).toBe(true)
  })

  it('{} is not an array', () => {
    expect(isArray({})).toBe(false)
  })

  it('null is not an array', () => {
    expect(isArray(null)).toBe(false)
  })

  it('false is not an array', () => {
    expect(isArray(false)).toBe(false)
  })

  it('empty string is not an array', () => {
    expect(isArray('')).toBe(false)
  })

  it('"42" is not an array', () => {
    expect(isArray('42')).toBe(false)
  })

  it('42 is not an array', () => {
    expect(isArray(42)).toBe(false)
  })

  it('34.00 is not an array', () => {
    expect(isArray(34.0)).toBe(false)
  })

  it('123e-5 is not an array', () => {
    expect(isArray(123e-5)).toBe(false)
  })

  it('"[]" is not an array', () => {
    expect(isArray('[]')).toBe(false)
  })

  it('undefined is not an array', () => {
    expect(isArray(undefined)).toBe(false)
  })

  it('function is not an array', () => {
    expect(isArray(function () {})).toBe(false)
  })

  it('object with numeric key is not an array', () => {
    const obj: Record<number, boolean> = {}
    obj[0] = true
    expect(isArray(obj)).toBe(false)
  })

  it('array with extra property is still an array', () => {
    const arr: any = []
    arr.foo = 'bar'
    expect(isArray(arr)).toBe(true)
  })
})
