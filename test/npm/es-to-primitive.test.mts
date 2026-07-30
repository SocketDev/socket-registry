/**
 * @file Tests for es-to-primitive NPM package override. Ported 1:1 from
 *   upstream v1.3.4 (f33dccb3):
 *   https://github.com/ljharb/es-to-primitive/blob/f33dccb3a8950f4abc67f43bec81f776da9cdf13/test/index.js.
 */

import { createRequire } from 'node:module'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { setupNpmPackageTest } from '../util/npm-package-helper.mts'

const {
  eco,
  module: toPrimitive,
  pkgPath,
  skip,
  sockRegPkgName,
} = setupNpmPackageTest(import.meta.url)

const requireCjs = createRequire(import.meta.url)
const ES5 = skip ? undefined : requireCjs(path.join(pkgPath, 'es5.js'))
const ES6 = skip ? undefined : requireCjs(path.join(pkgPath, 'es6.js'))
const ES2015 = skip ? undefined : requireCjs(path.join(pkgPath, 'es2015.js'))

const coercibleObject = { toString: () => 42, valueOf: () => 3 }
const coercibleFnObject = {
  toString: () => 42,
  valueOf: () => function valueOfFn() {},
}
const uncoercibleObject = { toString: () => ({}), valueOf: () => ({}) }
const uncoercibleFnObject = {
  toString: () => function toStrFn() {},
  valueOf: () => function valueOfFn() {},
}
const toStringOnlyObject = { toString: () => 7, valueOf: () => ({}) }
const valueOfOnlyObject = { toString: () => ({}), valueOf: () => 4 }
const primitives = [null, undefined, true, false, 0, -0, 42, NaN, Infinity, '', 'abc']

describe(`${eco} > ${sockRegPkgName}`, { skip }, () => {
  describe('default export', () => {
    it('exposes the ES5 / ES6 / ES2015 methods', () => {
      expect(toPrimitive).toBe(ES2015)
      expect(toPrimitive.ES5).toBe(ES5)
      expect(toPrimitive.ES6).toBe(ES6)
      expect(toPrimitive.ES2015).toBe(ES2015)
    })
  })

  describe('es2015', () => {
    it('has a length of 1 and the name ToPrimitive', () => {
      expect(toPrimitive.length).toBe(1)
      expect(toPrimitive.name).toBe('ToPrimitive')
    })

    it('returns primitives unchanged', () => {
      for (let i = 0, { length } = primitives; i < length; i += 1) {
        const value = primitives[i]
        expect(Object.is(toPrimitive(value), value)).toBe(true)
        expect(Object.is(toPrimitive(value, String), value)).toBe(true)
        expect(Object.is(toPrimitive(value, Number), value)).toBe(true)
      }
      expect(toPrimitive(42n)).toBe(42n)
    })

    it('returns symbols unchanged and unboxes Symbol objects', () => {
      const sym = Symbol('sym')
      expect(toPrimitive(sym)).toBe(sym)
      expect(toPrimitive(sym, String)).toBe(sym)
      expect(toPrimitive(sym, Number)).toBe(sym)

      const primitiveSym = Symbol('primitiveSym')
      const objectSym = Object(primitiveSym)
      expect(toPrimitive(objectSym)).toBe(primitiveSym)
      expect(toPrimitive(objectSym, String)).toBe(primitiveSym)
      expect(toPrimitive(objectSym, Number)).toBe(primitiveSym)
    })

    it('stringifies arrays', () => {
      const arrays = [[], ['a', 'b'], [1, 2]]
      for (let i = 0, { length } = arrays; i < length; i += 1) {
        const arr = arrays[i]!
        expect(toPrimitive(arr)).toBe(String(arr))
        expect(toPrimitive(arr, String)).toBe(String(arr))
        expect(toPrimitive(arr, Number)).toBe(String(arr))
      }
    })

    it('coerces dates by hint', () => {
      const dates = [new Date(), new Date(0), new Date(NaN)]
      for (let i = 0, { length } = dates; i < length; i += 1) {
        const date = dates[i]!
        expect(toPrimitive(date)).toBe(String(date))
        expect(toPrimitive(date, String)).toBe(String(date))
        expect(Object.is(toPrimitive(date, Number), Number(date))).toBe(true)
      }
    })

    it('coerces plain objects by hint', () => {
      expect(toPrimitive(coercibleObject)).toBe(coercibleObject.valueOf())
      expect(toPrimitive(coercibleObject, Number)).toBe(
        coercibleObject.valueOf(),
      )
      expect(toPrimitive(coercibleObject, String)).toBe(
        coercibleObject.toString(),
      )

      expect(toPrimitive(coercibleFnObject)).toBe(coercibleFnObject.toString())
      expect(toPrimitive(coercibleFnObject, Number)).toBe(
        coercibleFnObject.toString(),
      )
      expect(toPrimitive(coercibleFnObject, String)).toBe(
        coercibleFnObject.toString(),
      )

      expect(toPrimitive({})).toBe('[object Object]')
      expect(toPrimitive({}, Number)).toBe('[object Object]')
      expect(toPrimitive({}, String)).toBe('[object Object]')

      expect(toPrimitive(toStringOnlyObject)).toBe(
        toStringOnlyObject.toString(),
      )
      expect(toPrimitive(valueOfOnlyObject)).toBe(valueOfOnlyObject.valueOf())
    })

    it('invokes Symbol.toPrimitive when present', () => {
      const overriddenObject: Record<PropertyKey, unknown> = {
        toString: () => {
          throw new Error('should not be called')
        },
        valueOf: () => {
          throw new Error('should not be called')
        },
      }
      overriddenObject[Symbol.toPrimitive] = (hint: string) => String(hint)
      expect(toPrimitive(overriddenObject)).toBe('default')
      expect(toPrimitive(overriddenObject, Number)).toBe('number')
      expect(toPrimitive(overriddenObject, String)).toBe('string')

      const nullToPrimitive: Record<PropertyKey, unknown> = {
        toString: coercibleObject.toString,
        valueOf: coercibleObject.valueOf,
      }
      nullToPrimitive[Symbol.toPrimitive] = null
      expect(toPrimitive(nullToPrimitive)).toBe(toPrimitive(coercibleObject))
    })

    it('throws for exotic Symbol.toPrimitive shapes', () => {
      const nonFunctionToPrimitive: Record<PropertyKey, unknown> = {}
      nonFunctionToPrimitive[Symbol.toPrimitive] = {}
      expect(() => toPrimitive(nonFunctionToPrimitive)).toThrow(TypeError)

      const uncoercibleToPrimitive: Record<PropertyKey, unknown> = {}
      uncoercibleToPrimitive[Symbol.toPrimitive] = (hint: string) => ({
        toString: () => hint,
      })
      expect(() => toPrimitive(uncoercibleToPrimitive)).toThrow(TypeError)

      const throwingToPrimitive: Record<PropertyKey, unknown> = {}
      throwingToPrimitive[Symbol.toPrimitive] = (hint: string) => {
        throw new RangeError(hint)
      }
      expect(() => toPrimitive(throwingToPrimitive)).toThrow(RangeError)
    })

    it('throws for uncoercible objects', () => {
      expect(() => toPrimitive(uncoercibleObject)).toThrow(TypeError)
      expect(() => toPrimitive(uncoercibleObject, Number)).toThrow(TypeError)
      expect(() => toPrimitive(uncoercibleObject, String)).toThrow(TypeError)
      expect(() => toPrimitive(uncoercibleFnObject)).toThrow(TypeError)
    })
  })

  describe('es5', () => {
    it('has a length of 1 and the name ToPrimitive', () => {
      expect(ES5.length).toBe(1)
      expect(ES5.name).toBe('ToPrimitive')
    })

    it('returns primitives unchanged', () => {
      for (let i = 0, { length } = primitives; i < length; i += 1) {
        const value = primitives[i]
        expect(Object.is(ES5(value), value)).toBe(true)
        expect(Object.is(ES5(value, String), value)).toBe(true)
        expect(Object.is(ES5(value, Number), value)).toBe(true)
      }
    })

    it('handles Symbol objects with ES5 semantics', () => {
      const primitiveSym = Symbol('primitiveSym')
      const stringSym = Symbol.prototype.toString.call(primitiveSym)
      const objectSym = Object(primitiveSym)
      expect(ES5(objectSym)).toBe(primitiveSym)
      expect(ES5(objectSym, String)).toBe(stringSym)
      expect(ES5(objectSym, Number)).toBe(primitiveSym)
    })

    it('stringifies arrays and coerces dates', () => {
      expect(ES5([1, 2])).toBe('1,2')
      const date = new Date(0)
      expect(ES5(date)).toBe(date.toString())
      expect(Object.is(ES5(date, Number), date.valueOf())).toBe(true)
    })

    it('coerces plain objects by hint', () => {
      expect(ES5(coercibleObject)).toBe(coercibleObject.valueOf())
      expect(ES5(coercibleObject, String)).toBe(coercibleObject.toString())
      expect(ES5(coercibleObject, Number)).toBe(coercibleObject.valueOf())
      expect(ES5(coercibleFnObject)).toBe(coercibleFnObject.toString())
      expect(ES5({})).toBe('[object Object]')
      expect(ES5(toStringOnlyObject)).toBe(toStringOnlyObject.toString())
      expect(ES5(valueOfOnlyObject)).toBe(valueOfOnlyObject.valueOf())
    })

    it('throws for uncoercible objects', () => {
      expect(() => ES5(uncoercibleObject)).toThrow(TypeError)
      expect(() => ES5(uncoercibleObject, String)).toThrow(TypeError)
      expect(() => ES5(uncoercibleObject, Number)).toThrow(TypeError)
      expect(() => ES5(uncoercibleFnObject)).toThrow(TypeError)
    })
  })
})
