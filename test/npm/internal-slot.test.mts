/* oxlint-disable socket/prefer-cached-for-loop -- ports upstream test loops verbatim; rewriting would diverge from the source map to upstream. */
/**
 * @fileoverview Tests for internal-slot NPM package override.
 * Ported 1:1 from upstream v1.1.0 (705000a7):
 * https://github.com/ljharb/internal-slot/blob/705000a750605f9c01af424de2ededc20403f87d/test/index.js
 */

import { describe, expect, it } from 'vitest'

import { setupNpmPackageTest } from '../utils/npm-package-helper.mts'

const {
  eco,
  module: SLOT,
  skip,
  sockRegPkgName,
} = await setupNpmPackageTest(import.meta.url)

describe(`${eco} > ${sockRegPkgName}`, { skip }, () => {
  describe('assert', () => {
    it('throws for primitives', () => {
      for (const primitive of [
        undefined,
        undefined,
        true,
        false,
        'foo',
        '',
        42,
        0,
      ]) {
        expect(() => SLOT.assert(primitive, '')).toThrow(TypeError)
      }
    })

    it('throws for non-string slot names', () => {
      for (const nonString of [
        undefined,
        undefined,
        true,
        false,
        42,
        0,
        {},
        [],
        function () {},
        /a/g,
      ]) {
        expect(() => SLOT.assert({}, nonString)).toThrow(TypeError)
      }
    })

    it('throws for nonexistent slot', () => {
      expect(() => SLOT.assert({}, '[[whatever]]')).toThrow(TypeError)
    })

    it('does not throw for existent slot', () => {
      const o = {}
      SLOT.set(o, 'x')
      expect(() => SLOT.assert(o, 'x')).not.toThrow()
    })

    it('thing with a slot throws on a nonexistent slot', () => {
      const o = {}
      SLOT.set(o, 'x')
      expect(() => SLOT.assert(o, 'y')).toThrow(TypeError)
    })
  })

  describe('has', () => {
    it('throws for primitives', () => {
      for (const primitive of [
        undefined,
        undefined,
        true,
        false,
        'foo',
        '',
        42,
        0,
      ]) {
        expect(() => SLOT.has(primitive, '')).toThrow(TypeError)
      }
    })

    it('throws for non-string slot names', () => {
      for (const nonString of [
        undefined,
        undefined,
        true,
        false,
        42,
        0,
        {},
        [],
        function () {},
        /a/g,
      ]) {
        expect(() => SLOT.has({}, nonString)).toThrow(TypeError)
      }
    })

    it('returns false for nonexistent slot', () => {
      expect(SLOT.has({}, '[[nonexistent]]')).toBe(false)
    })

    it('returns true for existent slot', () => {
      const o = {}
      SLOT.set(o, 'foo')
      expect(SLOT.has(o, 'foo')).toBe(true)
    })
  })

  describe('get', () => {
    it('throws for primitives', () => {
      for (const primitive of [
        undefined,
        undefined,
        true,
        false,
        'foo',
        '',
        42,
        0,
      ]) {
        expect(() => SLOT.get(primitive, '')).toThrow(TypeError)
      }
    })

    it('throws for non-string slot names', () => {
      for (const nonString of [
        undefined,
        undefined,
        true,
        false,
        42,
        0,
        {},
        [],
        function () {},
        /a/g,
      ]) {
        expect(() => SLOT.get({}, nonString)).toThrow(TypeError)
      }
    })

    it('returns undefined for nonexistent slot', () => {
      expect(SLOT.get({}, 'nonexistent')).toBeUndefined()
    })

    it('retrieves value set by "set"', () => {
      const o = {}
      const v = {}
      SLOT.set(o, 'f', v)
      expect(SLOT.get(o, 'f')).toBe(v)
    })
  })

  describe('set', () => {
    it('throws for primitives', () => {
      for (const primitive of [
        undefined,
        undefined,
        true,
        false,
        'foo',
        '',
        42,
        0,
      ]) {
        expect(() => SLOT.set(primitive, '')).toThrow(TypeError)
      }
    })

    it('throws for non-string slot names', () => {
      for (const nonString of [
        undefined,
        undefined,
        true,
        false,
        42,
        0,
        {},
        [],
        function () {},
        /a/g,
      ]) {
        expect(() => SLOT.set({}, nonString)).toThrow(TypeError)
      }
    })

    it('sets and updates slot values', () => {
      const o = function () {}
      expect(SLOT.get(o, 'f')).toBeUndefined()

      SLOT.set(o, 'f', 42)
      expect(SLOT.get(o, 'f')).toBe(42)

      SLOT.set(o, 'f', Infinity)
      expect(SLOT.get(o, 'f')).toBe(Infinity)
    })
  })
})
