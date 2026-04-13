/**
 * @fileoverview Tests for is-weakset NPM package override.
 * Ported 1:1 from upstream v2.0.4 (a63f2927):
 * https://github.com/inspect-js/is-weakset/blob/a63f292737acdc9e0df55284317a98c1bf0be90d/test/index.js
 */

import { describe, expect, it } from 'vitest'

import { setupNpmPackageTest } from '../utils/npm-package-helper.mts'

const {
  eco,
  module: isWeakSet,
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
      expect(isWeakSet(nonCollection)).toBe(false)
    })

    it('returns false for a function', () => {
      expect(isWeakSet(function () {})).toBe(false)
    })
  })

  describe('Maps', { skip: typeof Map !== 'function' }, () => {
    it('Map is not a WeakSet', () => {
      expect(isWeakSet(new Map())).toBe(false)
    })
  })

  describe('Sets', { skip: typeof Set !== 'function' }, () => {
    it('Set is not a WeakSet', () => {
      expect(isWeakSet(new Set())).toBe(false)
    })
  })

  describe('WeakMaps', { skip: typeof WeakMap !== 'function' }, () => {
    it('WeakMap is not a WeakSet', () => {
      expect(isWeakSet(new WeakMap())).toBe(false)
    })
  })

  describe('WeakSets', { skip: typeof WeakSet !== 'function' }, () => {
    it('WeakSet is a WeakSet', () => {
      expect(isWeakSet(new WeakSet())).toBe(true)
    })
  })
})
