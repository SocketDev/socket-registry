/**
 * @fileoverview Tests for is-set NPM package override.
 * Ported 1:1 from upstream v2.0.3 (150c3cc4):
 * https://github.com/inspect-js/is-set/blob/150c3cc40592eb269c51ee831a271ecc0d24d974/test/index.js
 */

import { describe, expect, it } from 'vitest'

import { setupNpmPackageTest } from '../util/npm-package-helper.mts'

const {
  eco,
  module: isSet,
  skip,
  sockRegPkgName,
} = await setupNpmPackageTest(import.meta.url)

describe(`${eco} > ${sockRegPkgName}`, { skip }, () => {
  describe('non-collections', () => {
    it.each([
      undefined,
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
      expect(isSet(nonCollection)).toBe(false)
    })

    it('returns false for a function', () => {
      expect(isSet(function () {})).toBe(false)
    })
  })

  describe('Maps', { skip: typeof Map !== 'function' }, () => {
    it('Map is not a Set', () => {
      expect(isSet(new Map())).toBe(false)
    })
  })

  describe('Sets', { skip: typeof Set !== 'function' }, () => {
    it('Set is a Set', () => {
      expect(isSet(new Set())).toBe(true)
    })
  })

  describe('WeakMaps', { skip: typeof WeakMap !== 'function' }, () => {
    it('WeakMap is not a Set', () => {
      expect(isSet(new WeakMap())).toBe(false)
    })
  })

  describe('WeakSets', { skip: typeof WeakSet !== 'function' }, () => {
    it('WeakSet is not a Set', () => {
      expect(isSet(new WeakSet())).toBe(false)
    })
  })
})
