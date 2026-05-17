/**
 * @fileoverview Tests for object.values NPM package override.
 * Ported 1:1 from upstream v1.2.0 (7ac272ed):
 * https://github.com/es-shims/Object.values/blob/7ac272edeabd13b4ea662e71a2612358b28cfbce/test/tests.js
 */

import { describe, expect, it } from 'vitest'

import { setupNpmPackageTest } from '../util/npm-package-helper.mts'

const {
  eco,
  module: values,
  skip,
  sockRegPkgName,
} = await setupNpmPackageTest(import.meta.url)

describe(`${eco} > ${sockRegPkgName}`, { skip }, () => {
  const a = {}
  const b = {}
  const c = {}
  const obj = { a, b, c }

  it('basic support', () => {
    expect(values(obj)).toEqual([a, b, c])
  })

  it('duplicate values are included', () => {
    expect(values({ a, b: a, c })).toEqual([a, a, c])
  })

  it('values are in the same order as keys', () => {
    const object: Record<string | number, any> = { a, b }
    object[0] = 3
    object['c'] = c
    object[1] = 4
    delete object[0]
    const objKeys = Object.keys(object)
    const objValues = objKeys.map(key => object[key])
    expect(values(object)).toEqual(objValues)
  })

  it('non-enumerable properties are omitted', () => {
    const object = { a, b }
    Object.defineProperty(object, 'c', { enumerable: false, value: c })
    expect(values(object)).toEqual([a, b])
  })

  it('inherited properties are omitted', () => {
    const F = function (this: any) {} as any
    F.prototype.a = a
    const f = new F()
    f.b = b
    expect(values(f)).toEqual([b])
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
    expect(values(object)).toEqual([a, b, c, enumSym])
  })

  it('not-yet-visited keys deleted on [[Get]] must not show up in output', () => {
    const o: Record<string, any> = { a: 1, b: 2, c: 3 }
    Object.defineProperty(o, 'a', {
      get() {
        delete this.b
        return 1
      },
    })
    expect(values(o)).toEqual([1, 3])
  })

  it('not-yet-visited keys made non-enumerable on [[Get]] must not show up in output', () => {
    const o: Record<string, any> = { a: 'A', b: 'B' }
    Object.defineProperty(o, 'a', {
      get() {
        Object.defineProperty(o, 'b', { enumerable: false })
        return 'A'
      },
    })
    expect(values(o)).toEqual(['A'])
  })
})
