/**
 * @fileoverview Tests for has-symbols NPM package override.
 * Ported 1:1 from upstream v1.1.0 (7aefe479):
 * https://github.com/inspect-js/has-symbols/blob/7aefe479e315c27d742a2a329207d8eb7d3a5cec/test/index.js
 */

import { describe, expect, it } from 'vitest'

import { setupNpmPackageTest } from '../util/npm-package-helper.mts'

const {
  eco,
  module: hasSymbols,
  skip,
  sockRegPkgName,
} = await setupNpmPackageTest(import.meta.url)

describe(`${eco} > ${sockRegPkgName}`, { skip }, () => {
  it('is a function', () => {
    expect(typeof hasSymbols).toBe('function')
  })

  it('returns a boolean', () => {
    expect(typeof hasSymbols()).toBe('boolean')
  })

  describe('Symbols are supported', { skip: !hasSymbols() }, () => {
    it('Symbol is a function', () => {
      expect(typeof Symbol).toBe('function')
    })

    it('two symbols are not equal', () => {
      expect(Symbol()).not.toBe(Symbol())
    })

    it('Symbol#toString is a function', () => {
      expect(typeof Symbol.prototype.toString).toBe('function')
    })

    it('Object.getOwnPropertySymbols is a function', () => {
      expect(typeof Object.getOwnPropertySymbols).toBe('function')
    })

    it('symbol property is not enumerable', () => {
      const obj: Record<PropertyKey, unknown> = {}
      const sym = Symbol('test')
      obj[sym] = 42

      for (const _key in obj) {
        expect.fail('symbol property key was found in for..in of object')
      }

      expect(Object.keys(obj)).toEqual([])
      expect(Object.getOwnPropertyNames(obj)).toEqual([])
      expect(Object.getOwnPropertySymbols(obj)).toEqual([sym])
      expect(Object.prototype.propertyIsEnumerable.call(obj, sym)).toBe(true)
      expect(Object.getOwnPropertyDescriptor(obj, sym)).toEqual({
        configurable: true,
        enumerable: true,
        value: 42,
        writable: true,
      })
    })
  })

  describe('Symbols are not supported', { skip: hasSymbols() }, () => {
    it('global Symbol is undefined', () => {
      expect(typeof Symbol).toBe('undefined')
    })

    it('Object.getOwnPropertySymbols does not exist', () => {
      expect(typeof Object.getOwnPropertySymbols).toBe('undefined')
    })
  })
})
