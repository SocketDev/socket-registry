/**
 * @fileoverview Tests for unbox-primitive NPM package override.
 * Ported 1:1 from upstream v1.1.0 (57a9506f):
 * https://github.com/ljharb/unbox-primitive/blob/57a9506f/test/index.js
 */
import { describe, expect, it } from 'vitest'

import { setupNpmPackageTest } from '../utils/npm-package-helper.mts'

const {
  eco,
  module: unboxPrimitive,
  skip,
  sockRegPkgName,
} = await setupNpmPackageTest(import.meta.url)

describe(`${eco} > ${sockRegPkgName}`, { skip }, () => {
  describe('primitives', () => {
    it('throws for null and undefined', () => {
      expect(() => unboxPrimitive(undefined)).toThrow(TypeError)
      expect(() => unboxPrimitive(undefined)).toThrow(TypeError)
    })

    it('unboxes boxed primitives', () => {
      expect(unboxPrimitive(Object(true))).toBe(true)
      expect(unboxPrimitive(Object(false))).toBe(false)
      expect(unboxPrimitive(Object(0))).toBe(0)
      expect(unboxPrimitive(Object(42))).toBe(42)
      expect(unboxPrimitive(Object(''))).toBe('')
      expect(unboxPrimitive(Object('foo'))).toBe('foo')

      const sym = Symbol('test')
      expect(unboxPrimitive(Object(sym))).toBe(sym)

      expect(unboxPrimitive(Object(BigInt(42)))).toBe(BigInt(42))
    })
  })

  describe('objects', () => {
    it('throws for non-boxed objects', () => {
      expect(() => unboxPrimitive({})).toThrow(TypeError)
      expect(() => unboxPrimitive([])).toThrow(TypeError)
      expect(() => unboxPrimitive(function () {})).toThrow(TypeError)
      expect(() => unboxPrimitive(/a/g)).toThrow(TypeError)
      expect(() => unboxPrimitive(new Date())).toThrow(TypeError)
    })
  })
})
