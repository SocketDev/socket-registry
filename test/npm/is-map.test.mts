/**
 * @fileoverview Tests for is-map NPM package override.
 * Ported 1:1 from upstream v2.0.3 (8e53e508):
 * https://github.com/inspect-js/is-map/blob/8e53e50836254a8589aae5620019f6eaccb8729b/test/index.js
 */

import { describe, expect, it } from 'vitest'

import { setupNpmPackageTest } from '../utils/npm-package-helper.mts'

const {
  eco,
  module: isMap,
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
      expect(isMap(nonCollection)).toBe(false)
    })

    it('returns false for a function', () => {
      expect(isMap(function () {})).toBe(false)
    })
  })

  describe('Maps', { skip: typeof Map !== 'function' }, () => {
    it('Map is a Map', () => {
      expect(isMap(new Map())).toBe(true)
    })
  })

  describe('Sets', { skip: typeof Set !== 'function' }, () => {
    it('Set is not a Map', () => {
      expect(isMap(new Set())).toBe(false)
    })
  })

  describe('WeakMaps', { skip: typeof WeakMap !== 'function' }, () => {
    it('WeakMap is not a Map', () => {
      expect(isMap(new WeakMap())).toBe(false)
    })
  })

  describe('WeakSets', { skip: typeof WeakSet !== 'function' }, () => {
    it('WeakSet is not a Map', () => {
      expect(isMap(new WeakSet())).toBe(false)
    })
  })
})
