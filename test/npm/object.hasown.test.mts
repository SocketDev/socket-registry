/**
 * @fileoverview Tests for object.hasown NPM package override.
 * Ported 1:1 from upstream v1.1.4 (4e44c2dd):
 * https://github.com/es-shims/Object.hasOwn/blob/4e44c2ddaedaa40c4054383b80209797555b54a6/test/tests.js
 */

import { describe, expect, it } from 'vitest'

import { setupNpmPackageTest } from '../util/npm-package-helper.mts'

const {
  eco,
  module: hasOwn,
  skip,
  sockRegPkgName,
} = await setupNpmPackageTest(import.meta.url)

describe(`${eco} > ${sockRegPkgName}`, { skip }, () => {
  it('checks ToObject first', () => {
    const badPropertyKey = {
      toString() {
        throw new SyntaxError('nope')
      },
    }
    expect(() => hasOwn(undefined, badPropertyKey)).toThrow(TypeError)
  })

  it('checks ToPropertyKey next', () => {
    const badPropertyKey = {
      toString() {
        throw new SyntaxError('nope')
      },
    }
    expect(() => hasOwn({}, badPropertyKey)).toThrow(SyntaxError)
  })

  it('toString is not an own property', () => {
    const obj = { a: 1 }
    expect('toString' in obj).toBe(true)
    expect(hasOwn(obj, 'toString')).toBe(false)
  })

  it('own property is recognized', () => {
    expect(hasOwn({ a: 1 }, 'a')).toBe(true)
  })

  it('non-enumerable own property is recognized', () => {
    expect(hasOwn([], 'length')).toBe(true)
  })

  describe('Symbols', () => {
    it('own symbol is recognized', () => {
      const o: Record<symbol, boolean> = {}
      o[Symbol.iterator] = true
      expect(hasOwn(o, Symbol.iterator)).toBe(true)
    })

    it('built-in own symbol is recognized', () => {
      expect(hasOwn(Array.prototype, Symbol.iterator)).toBe(true)
    })
  })
})
