/**
 * @fileoverview Tests for object.entries NPM package override.
 * Ported 1:1 from upstream v1.1.8 (cff1adb0):
 * https://github.com/es-shims/Object.entries/blob/cff1adb0bb7340cad95fe34bb5ea9989cd1f7c1e/test/tests.js
 */

import { describe, expect, it } from 'vitest'

import { setupNpmPackageTest } from '../util/npm-package-helper.mts'

const {
  eco,
  module: entries,
  skip,
  sockRegPkgName,
} = await setupNpmPackageTest(import.meta.url)

describe(`${eco} > ${sockRegPkgName}`, { skip }, () => {
  const a = {}
  const b = {}
  const c = {}
  const obj = { a, b, c }

  it('basic support', () => {
    expect(entries(obj)).toEqual([
      ['a', a],
      ['b', b],
      ['c', c],
    ])
  })

  it('duplicate entries are included', () => {
    expect(entries({ a, b: a, c })).toEqual([
      ['a', a],
      ['b', a],
      ['c', c],
    ])
  })

  it('entries are in the same order as keys', () => {
    const object: Record<string | number, any> = { a, b }
    object[0] = 3
    object['c'] = c
    object[1] = 4
    delete object[0]
    const objKeys = Object.keys(object)
    const objEntries = objKeys.map(key => [key, object[key]] as [string, any])
    expect(entries(object)).toEqual(objEntries)
  })

  it('non-enumerable properties are omitted', () => {
    const object = { a, b }
    Object.defineProperty(object, 'c', { enumerable: false, value: c })
    expect(entries(object)).toEqual([
      ['a', a],
      ['b', b],
    ])
  })

  it('inherited properties are omitted', () => {
    const F = function (this: any) {} as any
    F.prototype.a = a
    const f = new F()
    f.b = b
    expect(entries(f)).toEqual([['b', b]])
  })

  it('Symbol properties are omitted', () => {
    const object: Record<string | symbol, any> = { a, b, c }
    const enumSym = Symbol('enum')
    const nonEnumSym = Symbol('non enum')
    object[enumSym] = enumSym
    object['d'] = enumSym
    Object.defineProperty(object, nonEnumSym, {
      enumerable: false,
      value: nonEnumSym,
    })
    expect(entries(object)).toEqual([
      ['a', a],
      ['b', b],
      ['c', c],
      ['d', enumSym],
    ])
  })

  it('not-yet-visited keys deleted on [[Get]] must not show up in output', () => {
    const o: Record<string, any> = { a: 1, b: 2, c: 3 }
    Object.defineProperty(o, 'a', {
      get() {
        delete this.b
        return 1
      },
    })
    expect(entries(o)).toEqual([
      ['a', 1],
      ['c', 3],
    ])
  })

  it('not-yet-visited keys made non-enumerable on [[Get]] must not show up in output', () => {
    const o: Record<string, any> = { a: 'A', b: 'B' }
    Object.defineProperty(o, 'a', {
      get() {
        Object.defineProperty(o, 'b', { enumerable: false })
        return 'A'
      },
    })
    expect(entries(o)).toEqual([['a', 'A']])
  })
})
