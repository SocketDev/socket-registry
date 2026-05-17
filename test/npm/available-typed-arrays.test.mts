/**
 * @fileoverview Tests for available-typed-arrays NPM package override.
 * Ported 1:1 from upstream v1.0.7 (d72cd6154ce39482ca83bed2200ff3b56c76e8d8):
 * https://github.com/inspect-js/available-typed-arrays/blob/d72cd6154ce39482ca83bed2200ff3b56c76e8d8/test/index.js
 */

import { describe, expect, it } from 'vitest'

import { setupNpmPackageTest } from '../util/npm-package-helper.mts'

const {
  eco,
  module: availableTypedArrays,
  skip,
  sockRegPkgName,
} = await setupNpmPackageTest(import.meta.url)

describe(`${eco} > ${sockRegPkgName}`, { skip }, () => {
  it('is a function', () => {
    expect(typeof availableTypedArrays).toBe('function')
  })

  it('returns an array', () => {
    const arrays = availableTypedArrays()
    expect(Array.isArray(arrays)).toBe(true)
  })

  it('contains only strings', () => {
    const arrays = availableTypedArrays()
    expect(arrays.every((array: any) => typeof array === 'string')).toBe(true)
  })
})
