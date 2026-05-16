/* oxlint-disable socket/prefer-cached-for-loop -- ports upstream test loops verbatim; rewriting would diverge from the source map to upstream. */
/**
 * @fileoverview Tests for get-symbol-description NPM package override.
 * Ported 1:1 from upstream v1.1.0 (1489d87a1af261f0f90faa73c619090363f7976b):
 * https://github.com/inspect-js/get-symbol-description/blob/1489d87a1af261f0f90faa73c619090363f7976b/test/index.js
 */

import { describe, expect, it } from 'vitest'

import { setupNpmPackageTest } from '../utils/npm-package-helper.mts'

const {
  eco,
  module: getSymbolDescription,
  skip,
  sockRegPkgName,
} = await setupNpmPackageTest(import.meta.url)

const hasSymbols =
  typeof Symbol === 'function' && typeof Symbol('foo') === 'symbol'

describe(`${eco} > ${sockRegPkgName}`, { skip }, () => {
  it('throws for non-symbol values', () => {
    const nonSymbols = [
      undefined,
      // oxlint-disable-next-line socket/prefer-undefined-over-null -- spec test: getSymbolDescription throws for both null and undefined; both must be exercised.
      null,
      true,
      false,
      0,
      42,
      NaN,
      Infinity,
      '',
      'foo',
      [],
      {},
      /a/g,
      () => {},
    ]
    for (let i = 0, { length } = nonSymbols; i < length; i += 1) {
      const nonSymbol = nonSymbols[i]
      expect(() => getSymbolDescription(nonSymbol)).toThrow()
    }
  })

  describe('with symbols', { skip: !hasSymbols }, () => {
    it('returns correct descriptions', () => {
      const cases: Array<[symbol, string | undefined]> = [
        [Symbol(), undefined],
        [Symbol(undefined), undefined],
        // oxlint-disable-next-line socket/prefer-undefined-over-null -- spec: Symbol(null).description === "null"; Symbol(undefined).description === undefined.
        [Symbol(null as any), 'null'],
        [Symbol.iterator, 'Symbol.iterator'],
        [Symbol('foo'), 'foo'],
      ]
      for (const [sym, desc] of cases) {
        expect(getSymbolDescription(sym)).toBe(desc)
      }
    })

    it(
      'returns empty string for Symbol("")',
      {
        skip:
          !Object.hasOwn(Symbol.prototype, 'description') &&
          !function inferTest() {}.name,
      },
      () => {
        expect(getSymbolDescription(Symbol(''))).toBe('')
      },
    )

    it(
      'returns empty string for Symbol.for("")',
      { skip: !Symbol.for || !Symbol.keyFor },
      () => {
        expect(getSymbolDescription(Symbol.for(''))).toBe('')
      },
    )
  })
})
