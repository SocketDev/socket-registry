/**
 * @fileoverview Tests for number-is-nan NPM package override.
 * Ported 1:1 from upstream v1.0.1 (8982e8c4):
 * https://github.com/sindresorhus/number-is-nan/blob/8982e8c42c724434bfa107f8bb65c19d4b16930d/test.js
 */

import { describe, expect, it } from 'vitest'

import { setupNpmPackageTest } from '../utils/npm-package-helper.mts'

const {
  eco,
  module: numberIsNan,
  skip,
  sockRegPkgName,
} = await setupNpmPackageTest(import.meta.url)

describe(`${eco} > ${sockRegPkgName}`, { skip }, () => {
  it('returns true for NaN', () => {
    expect(numberIsNan(NaN)).toBe(true)
  })

  it('returns false for non-NaN values', () => {
    expect(numberIsNan()).toBe(false)
    expect(numberIsNan(true)).toBe(false)
    expect(numberIsNan(false)).toBe(false)
    expect(numberIsNan(undefined)).toBe(false)
    expect(numberIsNan(0)).toBe(false)
    expect(numberIsNan(Infinity)).toBe(false)
    expect(numberIsNan(-Infinity)).toBe(false)
    expect(numberIsNan('')).toBe(false)
    expect(numberIsNan('unicorn')).toBe(false)
    expect(numberIsNan({})).toBe(false)
    expect(numberIsNan([])).toBe(false)
  })
})
