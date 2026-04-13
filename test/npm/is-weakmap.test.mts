/**
 * @fileoverview Tests for is-weakmap NPM package override.
 * Ported 1:1 from upstream v2.0.2 (a747afa3):
 * https://github.com/inspect-js/is-weakmap/blob/a747afa315110eb6849e5be97686a577d2f16953/test/index.js
 */

import { describe, expect, it } from 'vitest'

import { setupNpmPackageTest } from '../utils/npm-package-helper.mts'

const {
  eco,
  module: isWeakMap,
  skip,
  sockRegPkgName,
} = await setupNpmPackageTest(import.meta.url)

describe(`${eco} > ${sockRegPkgName}`, { skip }, () => {
  describe('non-collections', () => {
    it.each([
      null,
      undefined,
      true,
      false,
      42,
      0,
      -0,
      NaN,
      Infinity,
      '',
      'foo',
      /a/g,
      [],
      {},
    ])('returns false for %s', nonCollection => {
      expect(isWeakMap(nonCollection)).toBe(false)
    })

    it('returns false for a function', () => {
      expect(isWeakMap(function () {})).toBe(false)
    })
  })

  describe('Maps', { skip: typeof Map !== 'function' }, () => {
    it('Map is not a WeakMap', () => {
      expect(isWeakMap(new Map())).toBe(false)
    })
  })

  describe('Sets', { skip: typeof Set !== 'function' }, () => {
    it('Set is not a WeakMap', () => {
      expect(isWeakMap(new Set())).toBe(false)
    })
  })

  describe('WeakMaps', { skip: typeof WeakMap !== 'function' }, () => {
    it('WeakMap is a WeakMap', () => {
      expect(isWeakMap(new WeakMap())).toBe(true)
    })
  })

  describe('WeakSets', { skip: typeof WeakSet !== 'function' }, () => {
    it('WeakSet is not a WeakMap', () => {
      expect(isWeakMap(new WeakSet())).toBe(false)
    })
  })
})
