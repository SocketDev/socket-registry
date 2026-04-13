/**
 * @fileoverview Tests for is-bigint NPM package override.
 * Ported 1:1 from upstream v1.1.0 (053a24a4):
 * https://github.com/inspect-js/is-bigint/blob/053a24a40506e5f90e12e265583f65575d4f5703/test/index.js
 */

import { describe, expect, it } from 'vitest'

import { setupNpmPackageTest } from '../utils/npm-package-helper.mts'

const {
  eco,
  module: isBigInt,
  skip,
  sockRegPkgName,
} = await setupNpmPackageTest(import.meta.url)

const hasBigInts = typeof BigInt === 'function'
const hasToStringTag =
  typeof Symbol === 'function' && typeof Symbol.toStringTag === 'symbol'

describe(`${eco} > ${sockRegPkgName}`, { skip }, () => {
  describe('non-BigInt values', () => {
    it.each([
      undefined,
      null,
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
      function () {},
    ])('returns false for %s', value => {
      expect(isBigInt(value)).toBe(false)
    })

    it('returns false for wrapped booleans', () => {
      expect(isBigInt(Object(true))).toBe(false)
      expect(isBigInt(Object(false))).toBe(false)
    })
  })

  describe('faked BigInt values', () => {
    it(
      'object with valueOf returning a BigInt is not a BigInt',
      { skip: !hasBigInts },
      () => {
        const fakeBigInt = {
          valueOf: function () {
            return BigInt(42)
          },
        }
        expect(isBigInt(fakeBigInt)).toBe(false)
      },
    )

    it(
      'faked @@toStringTag with valueOf returning a BigInt is not a BigInt',
      { skip: !hasBigInts || !hasToStringTag },
      () => {
        const fakeBigInt: Record<PropertyKey, unknown> = {
          valueOf: function () {
            return BigInt(42)
          },
        }
        fakeBigInt[Symbol.toStringTag] = 'BigInt'
        expect(isBigInt(fakeBigInt)).toBe(false)

        const notSoFakeBigInt: Record<PropertyKey, unknown> = {
          valueOf: function () {
            return 42
          },
        }
        notSoFakeBigInt[Symbol.toStringTag] = 'BigInt'
        expect(isBigInt(notSoFakeBigInt)).toBe(false)
      },
    )

    it('object with toString returning 42n is not a BigInt', () => {
      const fakeBigIntString = {
        toString: function () {
          return '42n'
        },
      }
      expect(isBigInt(fakeBigIntString)).toBe(false)
    })
  })

  describe('BigInt support', { skip: !hasBigInts }, () => {
    it('BigInt primitives are BigInts', () => {
      expect(isBigInt(BigInt(0))).toBe(true)
      expect(isBigInt(BigInt(42))).toBe(true)
      expect(isBigInt(BigInt(-1))).toBe(true)
    })

    it('wrapped BigInt is a BigInt', () => {
      expect(isBigInt(Object(BigInt(42)))).toBe(true)
    })
  })
})
