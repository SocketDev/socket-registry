/**
 * @fileoverview Tests for is-symbol NPM package override.
 * Ported 1:1 from upstream v1.1.1 (b1561d99):
 * https://github.com/inspect-js/is-symbol/blob/b1561d99da494df9bd1a768b1444ce9d1bc8ac1a/test/index.js
 */

import { describe, expect, it } from 'vitest'

import { setupNpmPackageTest } from '../utils/npm-package-helper.mts'

const {
  eco,
  module: isSymbol,
  skip,
  sockRegPkgName,
} = await setupNpmPackageTest(import.meta.url)

const hasSymbols = typeof Symbol === 'function'
const hasToStringTag = hasSymbols && typeof Symbol.toStringTag === 'symbol'

describe(`${eco} > ${sockRegPkgName}`, { skip }, () => {
  describe('non-symbol values', () => {
    it.each([
      undefined,
      undefined,
      true,
      false,
      0,
      42,
      NaN,
      Infinity,
      '',
      'foo',
      {},
      [],
      /a/g,
      new Date(),
    ])('returns false for %s', nonSymbol => {
      expect(isSymbol(nonSymbol)).toBe(false)
    })

    it('returns false for wrapped booleans', () => {
      expect(isSymbol(Object(true))).toBe(false)
      expect(isSymbol(Object(false))).toBe(false)
    })

    it('returns false for a function', () => {
      expect(isSymbol(function () {})).toBe(false)
    })
  })

  describe('faked symbol values', () => {
    it(
      'object with valueOf returning a symbol is not a symbol',
      { skip: !hasSymbols },
      () => {
        const fakeSymbol = {
          valueOf: function () {
            return Symbol('foo')
          },
        }
        expect(isSymbol(fakeSymbol)).toBe(false)
      },
    )

    it(
      'faked @@toStringTag does not fool the check',
      { skip: !hasToStringTag },
      () => {
        const fakeSymbol: Record<PropertyKey, unknown> = {
          valueOf: function () {
            return Symbol('foo')
          },
        }
        fakeSymbol[Symbol.toStringTag] = 'Symbol'
        expect(isSymbol(fakeSymbol)).toBe(false)

        const notSoFakeSymbol: Record<PropertyKey, unknown> = {
          valueOf: function () {
            return 42
          },
        }
        notSoFakeSymbol[Symbol.toStringTag] = 'Symbol'
        expect(isSymbol(notSoFakeSymbol)).toBe(false)
      },
    )

    it('object with toString returning Symbol(foo) is not a symbol', () => {
      const fakeSymbolString = {
        toString: function () {
          return 'Symbol(foo)'
        },
      }
      expect(isSymbol(fakeSymbolString)).toBe(false)
    })
  })

  describe('Symbol support', { skip: !hasSymbols }, () => {
    it('well-known Symbols are symbols', () => {
      const isWellKnown = (name: string) => name !== 'for' && name !== 'keyFor'
      const wellKnownSymbols =
        Object.getOwnPropertyNames(Symbol).filter(isWellKnown)
      for (let i = 0, { length } = wellKnownSymbols; i < length; i += 1) {
        const name = wellKnownSymbols[i]!
        const sym = (Symbol as any)[name]
        if (typeof sym === 'symbol') {
          expect(isSymbol(sym)).toBe(true)
        }
      }
    })

    it('user-created symbols are symbols', () => {
      expect(isSymbol(Symbol())).toBe(true)
      expect(isSymbol(Symbol('foo'))).toBe(true)
      expect(isSymbol(Symbol.for('foo'))).toBe(true)
      expect(isSymbol(Object(Symbol('object')))).toBe(true)
    })
  })
})
