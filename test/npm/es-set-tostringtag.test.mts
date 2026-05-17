/**
 * @fileoverview Tests for es-set-tostringtag NPM package override.
 * Ported 1:1 from upstream v2.1.0 (90e506fbfe24630e6fe3871639000d2f0ba09d6f):
 * https://github.com/es-shims/es-set-tostringtag/blob/90e506fbfe24630e6fe3871639000d2f0ba09d6f/test/index.js
 */

import { describe, expect, it } from 'vitest'

import { setupNpmPackageTest } from '../util/npm-package-helper.mts'

const {
  eco,
  module: setToStringTag,
  skip,
  sockRegPkgName,
} = await setupNpmPackageTest(import.meta.url)

const hasToStringTag =
  typeof Symbol === 'function' && typeof Symbol.toStringTag === 'symbol'

describe(`${eco} > ${sockRegPkgName}`, { skip }, () => {
  it('is a function', () => {
    expect(typeof setToStringTag).toBe('function')
  })

  it('throws if options is not an object', () => {
    const obj: Record<PropertyKey, unknown> = {}
    const sentinel = {}
    setToStringTag(obj, sentinel)
    expect(() => setToStringTag(obj, sentinel, { force: 'yes' })).toThrow(
      TypeError,
    )
  })

  describe('has Symbol.toStringTag', { skip: !hasToStringTag }, () => {
    it('sets toStringTag property', () => {
      const obj: Record<PropertyKey, unknown> = {}
      const sentinel = {}
      setToStringTag(obj, sentinel)
      expect(Object.hasOwn(obj, Symbol.toStringTag)).toBe(true)
      expect(obj[Symbol.toStringTag]).toBe(sentinel)
    })

    it('toStringTag works with Object.prototype.toString', () => {
      const obj: Record<PropertyKey, unknown> = {}
      expect(String(obj)).toBe('[object Object]')
    })

    it('does not override existing toStringTag', () => {
      const tagged: Record<PropertyKey, unknown> = {}
      tagged[Symbol.toStringTag] = 'already tagged'
      expect(String(tagged)).toBe('[object already tagged]')

      setToStringTag(tagged, 'new tag')
      expect(String(tagged)).toBe('[object already tagged]')
    })

    it('overrides toStringTag with force: true', () => {
      const tagged: Record<PropertyKey, unknown> = {}
      tagged[Symbol.toStringTag] = 'already tagged'

      setToStringTag(tagged, 'new tag', { force: true })
      expect(String(tagged)).toBe('[object new tag]')
    })

    it('has expected property descriptor', () => {
      const tagged: Record<PropertyKey, unknown> = {}
      setToStringTag(tagged, 'new tag', { force: true })
      expect(
        Object.getOwnPropertyDescriptor(tagged, Symbol.toStringTag),
      ).toEqual({
        configurable: true,
        enumerable: false,
        value: 'new tag',
        writable: false,
      })
    })

    it('is nonconfigurable with nonConfigurable: true', () => {
      const tagged: Record<PropertyKey, unknown> = {}
      setToStringTag(tagged, 'new tag', { force: true, nonConfigurable: true })
      expect(
        Object.getOwnPropertyDescriptor(tagged, Symbol.toStringTag),
      ).toEqual({
        configurable: false,
        enumerable: false,
        value: 'new tag',
        writable: false,
      })
    })
  })

  describe('does not have Symbol.toStringTag', { skip: hasToStringTag }, () => {
    it('object has no enumerable own keys', () => {
      const obj: Record<PropertyKey, unknown> = {}
      setToStringTag(obj, {})
      const keys = Object.keys(obj)
      expect(keys).toEqual([])
    })
  })
})
