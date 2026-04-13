/**
 * @fileoverview Tests for is-arguments NPM package override.
 * Ported 1:1 from upstream v1.2.0 (8d6e11a8):
 * https://github.com/inspect-js/is-arguments/blob/8d6e11a8f6b2616a70ada0da45c3ee860c633af6/test/index.js
 */

import { describe, expect, it } from 'vitest'

import { setupNpmPackageTest } from '../utils/npm-package-helper.mts'

const {
  eco,
  module: isArguments,
  skip,
  sockRegPkgName,
} = await setupNpmPackageTest(import.meta.url)

const hasToStringTag =
  typeof Symbol === 'function' && typeof Symbol.toStringTag === 'symbol'

describe(`${eco} > ${sockRegPkgName}`, { skip }, () => {
  describe('primitives', () => {
    it('array is not arguments', () => {
      expect(isArguments([])).toBe(false)
    })

    it('object is not arguments', () => {
      expect(isArguments({})).toBe(false)
    })

    it('empty string is not arguments', () => {
      expect(isArguments('')).toBe(false)
    })

    it('string is not arguments', () => {
      expect(isArguments('foo')).toBe(false)
    })

    it('naive array-like is not arguments', () => {
      expect(isArguments({ length: 2 })).toBe(false)
    })
  })

  describe('arguments object', () => {
    it('arguments is arguments', () => {
      ;(function () {
        expect(isArguments(arguments)).toBe(true)
      })()
    })

    it('sliced arguments is not arguments', () => {
      ;(function () {
        expect(isArguments(Array.prototype.slice.call(arguments))).toBe(false)
      })()
    })
  })

  describe('old-style arguments object', () => {
    it('old-style arguments is arguments', () => {
      const isLegacyArguments = isArguments.isLegacyArguments || isArguments
      const fakeOldArguments = {
        callee: function () {},
        length: 3,
      }
      expect(isLegacyArguments(fakeOldArguments)).toBe(true)
    })
  })

  describe('Symbol.toStringTag', { skip: !hasToStringTag }, () => {
    it('object with faked toStringTag is not arguments', () => {
      const obj: Record<PropertyKey, unknown> = {}
      obj[Symbol.toStringTag] = 'Arguments'
      expect(isArguments(obj)).toBe(false)
    })

    it('real arguments with faked toStringTag is not arguments', () => {
      const args: any = (function () {
        return arguments
      })()
      args[Symbol.toStringTag] = 'Arguments'
      expect(isArguments(args)).toBe(false)
    })
  })
})
