/**
 * @fileoverview Tests for es6-symbol NPM package override.
 * Ported 1:1 from upstream v3.1.4 (c57f8d88):
 * https://github.com/medikoo/es6-symbol/blob/c57f8d88070cec913ff4e3e0ed5192b2330373b2/test/index.js
 */

import { describe, expect, it } from 'vitest'

import { setupNpmPackageTest } from '../util/npm-package-helper.mts'

const {
  eco,
  module: SymbolPolyfill,
  skip,
  sockRegPkgName,
} = await setupNpmPackageTest(import.meta.url)

describe(`${eco} > ${sockRegPkgName}`, { skip }, () => {
  it('creates a symbol', () => {
    const symbol = SymbolPolyfill('test')
    expect(symbol).toBeDefined()
    expect(typeof symbol).toBe('symbol')
  })

  it('symbol property is not accessible by name', () => {
    const symbol = SymbolPolyfill('test')
    const obj: Record<PropertyKey, unknown> = {}
    obj[symbol] = 'foo'
    expect((obj as any).test).toBeUndefined()
    expect(obj[symbol]).toBe('foo')
  })
})
