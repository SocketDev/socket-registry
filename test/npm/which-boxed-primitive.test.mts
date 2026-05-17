/**
 * @fileoverview Tests for which-boxed-primitive NPM package override.
 * Ported 1:1 from upstream v1.1.1 (7f06bcbc):
 * https://github.com/inspect-js/which-boxed-primitive/blob/7f06bcbc/test/index.js
 */
import { describe, expect, it } from 'vitest'

import { setupNpmPackageTest } from '../util/npm-package-helper.mts'

const {
  eco,
  module: whichBoxedPrimitive,
  skip,
  sockRegPkgName,
} = await setupNpmPackageTest(import.meta.url)

describe(`${eco} > ${sockRegPkgName}`, { skip }, () => {
  describe('unboxed primitives', () => {
    it('returns null for primitives', () => {
      const primitives = [
        undefined,
        // oxlint-disable-next-line socket/prefer-undefined-over-null -- spec test: which-boxed-primitive must exercise both null and undefined receivers; both return null.
        null,
        true,
        false,
        0,
        -0,
        42,
        NaN,
        Infinity,
        '',
        'foo',
      ]
      for (let i = 0, { length } = primitives; i < length; i += 1) {
        const primitive = primitives[i]
        // oxlint-disable-next-line socket/prefer-undefined-over-null -- spec: whichBoxedPrimitive returns null for non-boxed inputs (per its public API).
        expect(whichBoxedPrimitive(primitive)).toBe(null)
      }
    })
  })

  describe('boxed primitives', () => {
    it('returns the constructor name for boxed primitives', () => {
      expect(whichBoxedPrimitive(Object(true))).toBe('Boolean')
      expect(whichBoxedPrimitive(Object(false))).toBe('Boolean')
      expect(whichBoxedPrimitive(Object(0))).toBe('Number')
      expect(whichBoxedPrimitive(Object(42))).toBe('Number')
      expect(whichBoxedPrimitive(Object(NaN))).toBe('Number')
      expect(whichBoxedPrimitive(Object(''))).toBe('String')
      expect(whichBoxedPrimitive(Object('foo'))).toBe('String')
      expect(whichBoxedPrimitive(Object(Symbol('test')))).toBe('Symbol')
      expect(whichBoxedPrimitive(Object(BigInt(42)))).toBe('BigInt')
    })
  })

  describe('non-primitive objects', () => {
    it('returns undefined for non-boxed objects', () => {
      const objects = [/a/g, new Date(), function () {}, [], {}]
      for (let i = 0, { length } = objects; i < length; i += 1) {
        const obj = objects[i]
        expect(whichBoxedPrimitive(obj)).toBe(undefined)
      }
    })
  })
})
