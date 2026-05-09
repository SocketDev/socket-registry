/**
 * @fileoverview Tests for has NPM package override.
 * Ported 1:1 from upstream v1.0.4 (50e19324):
 * https://github.com/tarruda/has/blob/50e19324b8aeb19b4534d5f4e38bba1405463bc1/test/index.js
 */

import { describe, expect, it } from 'vitest'

import { setupNpmPackageTest } from '../utils/npm-package-helper.mts'

const {
  eco,
  module: has,
  skip,
  sockRegPkgName,
} = await setupNpmPackageTest(import.meta.url)

describe(`${eco} > ${sockRegPkgName}`, { skip }, () => {
  it('object literal does not have own property "hasOwnProperty"', () => {
    expect(has({}, 'hasOwnProperty')).toBe(false)
  })

  it('Object.prototype has own property "hasOwnProperty"', () => {
    expect(has(Object.prototype, 'hasOwnProperty')).toBe(true)
  })

  it('calling has on null throws TypeError', () => {
    expect(() => has(undefined, 'throws')).toThrow(TypeError)
  })

  it('calling has on undefined throws TypeError', () => {
    expect(() => has(undefined, 'throws')).toThrow(TypeError)
  })
})
