/**
 * @fileoverview Tests for reflect.ownkeys NPM package override.
 * Ported 1:1 from upstream v1.1.6 (0fb9ad70):
 * https://github.com/es-shims/Reflect.ownKeys/blob/0fb9ad709d66d2b4fe8d113028f00a6d21eb1fbc/test/tests.js
 */

import { describe, expect, it } from 'vitest'

import { setupNpmPackageTest } from '../utils/npm-package-helper.mts'

const {
  eco,
  module: ownKeys,
  skip,
  sockRegPkgName,
} = await setupNpmPackageTest(import.meta.url)

describe(`${eco} > ${sockRegPkgName}`, { skip }, () => {
  it('normal object', () => {
    const o = { a: 1, b: 2 }
    expect(ownKeys(o).sort()).toEqual(['a', 'b'].sort())
  })

  it('object with prototype', () => {
    const p = { a: 1, b: 2 }
    const o = { c: 3, d: 4, __proto__: p }
    expect(ownKeys(o).sort()).toEqual(['c', 'd'].sort())
  })

  it('object with non-enumerable properties', () => {
    const o: Record<string, any> = {}
    Object.defineProperty(o, 'a', {
      enumerable: false,
      value: 1,
    })
    Object.defineProperty(o, 'b', {
      get() {
        return 2
      },
      enumerable: false,
    })
    expect(ownKeys(o).sort()).toEqual(['a', 'b'].sort())
  })

  describe('Symbols', () => {
    it('object with own symbol properties gets own keys', () => {
      const a = Symbol('a')
      const b = Symbol('b')

      const o: Record<string | symbol, any> = { a: 1, b: 2 }
      o[a] = 3
      o[b] = 4
      expect(ownKeys(o)).toEqual(['a', 'b', a, b])
    })

    it('object with symbol properties in prototype gets own keys', () => {
      const a = Symbol('a')
      const b = Symbol('b')

      const p: Record<string | symbol, any> = { a: 1 }
      p[a] = 3
      const child: Record<string | symbol, any> = { __proto__: p }
      child['b'] = 2
      child[b] = 4
      expect(ownKeys(child)).toEqual(['b', b])
    })

    it('object with non-enumerable symbol properties', () => {
      const a = Symbol('a')
      const nonEnum: Record<string | symbol, any> = { a: 1 }
      Object.defineProperty(nonEnum, a, {
        enumerable: false,
        value: 1,
      })
      expect(ownKeys(nonEnum)).toEqual(['a', a])
    })
  })
})
