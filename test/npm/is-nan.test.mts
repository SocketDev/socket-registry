/**
 * @fileoverview Tests for is-nan NPM package override.
 * Ported 1:1 from upstream v1.3.2 (96ed4e7b):
 * https://github.com/es-shims/is-nan/blob/96ed4e7bf4482c535782ced50f2eca11fce55d42/test/tests.js
 */

import { describe, expect, it } from 'vitest'

import { setupNpmPackageTest } from '../utils/npm-package-helper.mts'

const {
  eco,
  module: numberIsNaN,
  skip,
  sockRegPkgName,
} = await setupNpmPackageTest(import.meta.url)

describe(`${eco} > ${sockRegPkgName}`, { skip }, () => {
  describe('not NaN', () => {
    describe('primitives', () => {
      it('undefined is not NaN', () => {
        expect(numberIsNaN(undefined)).toBe(false)
      })

      it('null is not NaN', () => {
        expect(numberIsNaN(null)).toBe(false)
      })

      it('false is not NaN', () => {
        expect(numberIsNaN(false)).toBe(false)
      })

      it('true is not NaN', () => {
        expect(numberIsNaN(true)).toBe(false)
      })

      it('positive zero is not NaN', () => {
        expect(numberIsNaN(0)).toBe(false)
      })

      it('Infinity is not NaN', () => {
        expect(numberIsNaN(Infinity)).toBe(false)
      })

      it('-Infinity is not NaN', () => {
        expect(numberIsNaN(-Infinity)).toBe(false)
      })

      it('string is not NaN', () => {
        expect(numberIsNaN('foo')).toBe(false)
      })

      it('string NaN is not NaN', () => {
        expect(numberIsNaN('NaN')).toBe(false)
      })
    })

    it('array is not NaN', () => {
      expect(numberIsNaN([])).toBe(false)
    })

    it('object is not NaN', () => {
      expect(numberIsNaN({})).toBe(false)
    })

    it('function is not NaN', () => {
      expect(numberIsNaN(function () {})).toBe(false)
    })

    describe('valueOf', () => {
      it('object with valueOf of NaN, converted to Number, is NaN', () => {
        const obj = {
          valueOf: function () {
            return NaN
          },
        }
        expect(numberIsNaN(Number(obj))).toBe(true)
      })

      it('object with valueOf of NaN is not NaN', () => {
        const obj = {
          valueOf: function () {
            return NaN
          },
        }
        expect(numberIsNaN(obj)).toBe(false)
      })
    })
  })

  describe('NaN literal', () => {
    it('NaN is NaN', () => {
      expect(numberIsNaN(NaN)).toBe(true)
    })
  })
})
