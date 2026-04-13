/**
 * @fileoverview Tests for is-weakref NPM package override.
 * Ported 1:1 from upstream v1.1.1 (d20d4798):
 * https://github.com/inspect-js/is-weakref/blob/d20d47987837a1178a83893b8766e8ec0cc574e4/test/index.js
 */

import { describe, expect, it } from 'vitest'

import { setupNpmPackageTest } from '../utils/npm-package-helper.mts'

const {
  eco,
  module: isWeakRef,
  skip,
  sockRegPkgName,
} = await setupNpmPackageTest(import.meta.url)

describe(`${eco} > ${sockRegPkgName}`, { skip }, () => {
  it('is a function', () => {
    expect(typeof isWeakRef).toBe('function')
  })

  it('returns false for non-WeakRef values', () => {
    const nonWeakRefs = [
      undefined,
      null,
      true,
      false,
      42,
      0,
      Infinity,
      NaN,
      /a/g,
      function () {},
      {},
      [],
    ]
    for (const nonWeakRef of nonWeakRefs) {
      expect(isWeakRef(nonWeakRef)).toBe(false)
    }
  })

  describe('actual WeakRefs', { skip: typeof WeakRef === 'undefined' }, () => {
    it('WeakRef is a WeakRef', () => {
      const ref = new WeakRef({})
      expect(isWeakRef(ref)).toBe(true)
    })
  })
})
