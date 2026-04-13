/**
 * @fileoverview Tests for object-is NPM package override.
 * Ported 1:1 from upstream v1.1.6 (de5db308):
 * https://github.com/es-shims/object-is/blob/de5db308d01cf04294a71022c26e0b6d1b0d7ad6/test/tests.js
 */

import { describe, expect, it } from 'vitest'

import { setupNpmPackageTest } from '../utils/npm-package-helper.mts'

const {
  eco,
  module: is,
  skip,
  sockRegPkgName,
} = await setupNpmPackageTest(import.meta.url)

describe(`${eco} > ${sockRegPkgName}`, { skip }, () => {
  describe('works with primitives', () => {
    it('two absent args are the same', () => {
      expect(is()).toBe(true)
    })

    it('undefined & one absent arg are the same', () => {
      expect(is(undefined)).toBe(true)
    })

    it('undefined is undefined', () => {
      expect(is(undefined, undefined)).toBe(true)
    })

    it('null is null', () => {
      expect(is(null, null)).toBe(true)
    })

    it('true is true', () => {
      expect(is(true, true)).toBe(true)
    })

    it('false is false', () => {
      expect(is(false, false)).toBe(true)
    })

    it('true is not false', () => {
      expect(is(true, false)).toBe(false)
    })
  })

  describe('works with NaN', () => {
    it('NaN is NaN', () => {
      expect(is(NaN, NaN)).toBe(true)
    })
  })

  describe('differentiates zeroes', () => {
    it('+0 is +0', () => {
      expect(is(0, 0)).toBe(true)
    })

    it('-0 is -0', () => {
      expect(is(-0, -0)).toBe(true)
    })

    it('+0 is not -0', () => {
      expect(is(0, -0)).toBe(false)
    })
  })

  describe('nonzero numbers', () => {
    it('infinity is infinity', () => {
      expect(is(Infinity, Infinity)).toBe(true)
    })

    it('-infinity is -infinity', () => {
      expect(is(-Infinity, -Infinity)).toBe(true)
    })

    it('42 is 42', () => {
      expect(is(42, 42)).toBe(true)
    })

    it('42 is not -42', () => {
      expect(is(42, -42)).toBe(false)
    })
  })

  describe('strings', () => {
    it('empty string is empty string', () => {
      expect(is('', '')).toBe(true)
    })

    it('string is string', () => {
      expect(is('foo', 'foo')).toBe(true)
    })

    it('string is not different string', () => {
      expect(is('foo', 'bar')).toBe(false)
    })
  })

  describe('objects', () => {
    it('object is same object', () => {
      const obj = {}
      expect(is(obj, obj)).toBe(true)
    })

    it('object is not different object', () => {
      expect(is({}, {})).toBe(false)
    })
  })

  describe('Symbols', () => {
    it('Symbol.iterator is itself', () => {
      expect(is(Symbol.iterator, Symbol.iterator)).toBe(true)
    })

    it('different Symbols are not equal', () => {
      expect(is(Symbol(), Symbol())).toBe(false)
    })

    it('Symbol.iterator is not boxed form of itself', () => {
      expect(is(Symbol.iterator, Object(Symbol.iterator))).toBe(false)
    })
  })
})
