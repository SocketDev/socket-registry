/**
 * @fileoverview Tests for globalthis NPM package override.
 * Ported 1:1 from upstream v1.0.4 (1776bde5):
 * https://github.com/ljharb/System.global/blob/1776bde58ddfc1e3de7d49c859acdce57a5b21a0/test/tests.js
 */

import { describe, expect, it } from 'vitest'

import { setupNpmPackageTest } from '../util/npm-package-helper.mts'

const {
  eco,
  module: getGlobal,
  skip,
  sockRegPkgName,
} = await setupNpmPackageTest(import.meta.url)

const theGlobal = skip ? undefined : getGlobal()

describe(`${eco} > ${sockRegPkgName}`, { skip }, () => {
  it('is a function that returns an object', () => {
    expect(typeof getGlobal).toBe('function')
    expect(typeof theGlobal).toBe('object')
  })

  describe('built-in globals', () => {
    it('Math is on the global', () => {
      expect(theGlobal.Math).toBe(Math)
    })

    it('JSON is on the global', () => {
      expect(theGlobal.JSON).toBe(JSON)
    })

    it('String is on the global', () => {
      expect(theGlobal.String).toBe(String)
    })

    it('Array is on the global', () => {
      expect(theGlobal.Array).toBe(Array)
    })

    it('Number is on the global', () => {
      expect(theGlobal.Number).toBe(Number)
    })

    it('Boolean is on the global', () => {
      expect(theGlobal.Boolean).toBe(Boolean)
    })

    it('Object is on the global', () => {
      expect(theGlobal.Object).toBe(Object)
    })

    it('Function is on the global', () => {
      expect(theGlobal.Function).toBe(Function)
    })

    it('Date is on the global', () => {
      expect(theGlobal.Date).toBe(Date)
    })

    it('RegExp is on the global', () => {
      expect(theGlobal.RegExp).toBe(RegExp)
    })

    it(
      'Symbol is on the global',
      { skip: typeof Symbol === 'undefined' },
      () => {
        expect(theGlobal.Symbol).toBe(Symbol)
      },
    )
  })
})
