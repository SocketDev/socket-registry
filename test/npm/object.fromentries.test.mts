/**
 * @fileoverview Tests for object.fromentries NPM package override.
 * Ported 1:1 from upstream v2.0.8 (4889d056):
 * https://github.com/es-shims/Object.fromEntries/blob/4889d0564c7bf79c53748e0021f3925d393c083b/test/tests.js
 */

import { describe, expect, it } from 'vitest'

import { setupNpmPackageTest } from '../utils/npm-package-helper.mts'

const {
  eco,
  module: fromEntries,
  skip,
  sockRegPkgName,
} = await setupNpmPackageTest(import.meta.url)

describe(`${eco} > ${sockRegPkgName}`, { skip }, () => {
  it('converts entries to object', () => {
    const a = {}
    const b = {}
    const c = {}
    const entries: Array<[string, object]> = [
      ['a', a],
      ['b', b],
      ['c', c],
    ]
    const obj = { a, b, c }
    expect(fromEntries(entries)).toEqual(obj)
  })

  it('throws on absent iterable', () => {
    expect(() => fromEntries()).toThrow()
  })

  it('throws on undefined', () => {
    expect(() => fromEntries(undefined)).toThrow()
  })

  it('throws on null', () => {
    expect(() => fromEntries(null)).toThrow()
  })

  it('works with a duplicate key', () => {
    expect(
      fromEntries([
        ['foo', 1],
        ['foo', 2],
      ]),
    ).toEqual({ foo: 2 })
  })
})
