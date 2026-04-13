/**
 * @fileoverview Tests for has-tostringtag NPM package override.
 * Ported 1:1 from upstream v1.0.2 (690da6a3afbddcf018aa162c42869dcf4f8375f1):
 * https://github.com/inspect-js/has-tostringtag/blob/690da6a3afbddcf018aa162c42869dcf4f8375f1/test/index.js
 */

import { describe, expect, it } from 'vitest'

import { setupNpmPackageTest } from '../utils/npm-package-helper.mts'

const {
  eco,
  module: hasSymbolToStringTag,
  skip,
  sockRegPkgName,
} = await setupNpmPackageTest(import.meta.url)

describe(`${eco} > ${sockRegPkgName}`, { skip }, () => {
  it('is a function', () => {
    expect(typeof hasSymbolToStringTag).toBe('function')
  })

  it('returns a boolean', () => {
    expect(typeof hasSymbolToStringTag()).toBe('boolean')
  })

  describe(
    'Symbol.toStringTag exists',
    { skip: !hasSymbolToStringTag() },
    () => {
      it('Symbol is a function', () => {
        expect(typeof Symbol).toBe('function')
      })

      it('Symbol.toStringTag exists', () => {
        expect(Symbol.toStringTag).toBeTruthy()
      })

      it('works with Object.prototype.toString', () => {
        const obj: Record<PropertyKey, unknown> = {}
        obj[Symbol.toStringTag] = 'test'
        expect(Object.prototype.toString.call(obj)).toBe('[object test]')
      })
    },
  )

  describe(
    'Symbol.toStringTag does not exist',
    { skip: hasSymbolToStringTag() },
    () => {
      it('global Symbol.toStringTag is undefined', () => {
        const tagType =
          typeof Symbol === 'undefined'
            ? 'undefined'
            : typeof Symbol.toStringTag
        expect(tagType).toBe('undefined')
      })
    },
  )
})
