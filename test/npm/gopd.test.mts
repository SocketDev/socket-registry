/**
 * @fileoverview Tests for gopd NPM package override.
 * Ported 1:1 from upstream v1.2.0 (c204ca2d):
 * https://github.com/ljharb/gopd/blob/c204ca2d2aced0ba4e336007b46a9cbef3c23311/test/index.js
 */

import { describe, expect, it } from 'vitest'

import { setupNpmPackageTest } from '../util/npm-package-helper.mts'

const {
  eco,
  module: gOPD,
  skip,
  sockRegPkgName,
} = await setupNpmPackageTest(import.meta.url)

describe(`${eco} > ${sockRegPkgName}`, { skip }, () => {
  describe('supported', { skip: !gOPD }, () => {
    it('is a function', () => {
      expect(typeof gOPD).toBe('function')
    })

    it('returns expected descriptor', () => {
      const obj = { x: 1 }
      expect('x' in obj).toBe(true)

      const desc = gOPD(obj, 'x')
      expect(desc).toEqual({
        configurable: true,
        enumerable: true,
        value: 1,
        writable: true,
      })
    })
  })

  describe('not supported', { skip: !!gOPD }, () => {
    it('is falsy', () => {
      expect(gOPD).toBeFalsy()
    })
  })
})
