import path from 'node:path'

import { describe, expect, it } from 'vitest'

import constants from '@socketregistry/scripts/constants'
import { isPackageTestingSkipped } from '@socketregistry/scripts/lib/tests'
import { logger } from '@socketsecurity/registry/lib/logger'

const { NPM, testNpmNodeWorkspacesPath } = constants

const eco = NPM
const sockRegPkgName = path.basename(__filename, '.test.ts')
const pkgPath = path.join(testNpmNodeWorkspacesPath, sockRegPkgName)

// es6-object-assign has no unit tests.
// https://github.com/rubennorte/es6-object-assign/tree/v1.1.0
// Tests from https://github.com/ljharb/object.assign/tree/v4.1.5/test.
describe(
  `${eco} > ${sockRegPkgName}`,
  { skip: isPackageTestingSkipped(eco, sockRegPkgName) },
  () => {
    const es6oa = require(path.join(pkgPath, 'index.js'))

    it('does not have "pending exception" logic in implementation', () => {
      /*
       * Firefox 37 still has "pending exception" logic in its Object.assign implementation,
       * which is 72% slower than our shim, and Firefox 40's native implementation.
       */
      const thrower = Object.preventExtensions({ 1: '2' })
      expect(() => {
        es6oa.assign(thrower, 'xy')
      }).toThrow(TypeError)
      expect(thrower[1]).toBe('2')
    })

    it('error cases', () => {
      expect(() => {
        es6oa.assign(null)
      }).toThrow(TypeError)
      expect(() => {
        es6oa.assign(undefined)
      }).toThrow(TypeError)
      expect(() => {
        es6oa.assign(null, {})
      }).toThrow(TypeError)
      expect(() => {
        es6oa.assign(undefined, {})
      }).toThrow(TypeError)
    })

    it('non-object target, no sources', () => {
      const bool = es6oa.assign(true)
      expect(typeof bool).toBe('object')
      expect(Boolean.prototype.valueOf.call(bool)).toBe(true)

      const number = es6oa.assign(1)
      expect(typeof number).toBe('object')
      expect(Number.prototype.valueOf.call(number)).toBe(1)

      const string = es6oa.assign('1')
      expect(typeof string).toBe('object')
      expect(String.prototype.valueOf.call(string)).toBe('1')
    })

    it('non-object target, with sources', () => {
      const signal = {}

      // Test boolean.
      const bool = es6oa.assign(true, { a: signal })
      expect(typeof bool).toBe('object')
      expect(Boolean.prototype.valueOf.call(bool)).toBe(true)
      expect(bool.a).toBe(signal)

      // Test number.
      const number = es6oa.assign(1, { a: signal })
      expect(typeof number).toBe('object')
      expect(Number.prototype.valueOf.call(number)).toBe(1)
      expect(number.a).toBe(signal)

      // Test string.
      const string = es6oa.assign('1', { a: signal })
      expect(typeof string).toBe('object')
      expect(String.prototype.valueOf.call(string)).toBe('1')
      expect(string.a).toBe(signal)
    })

    it('non-object sources', () => {
      expect(es6oa.assign({ a: 1 }, null, { b: 2 })).toEqual({ a: 1, b: 2 })
      expect(es6oa.assign({ a: 1 }, { b: 2 }, undefined)).toEqual({
        a: 1,
        b: 2,
      })
    })

    it('returns the modified target object', () => {
      const target = {}
      const returned = es6oa.assign(target, { a: 1 })
      expect(returned).toBe(target)
    })

    it('has the right name', () => {
      expect(es6oa.assign.name).toBe('assign')
    })

    it('has the right length', () => {
      expect(es6oa.assign.length).toBe(2)
    })

    it('merge two objects', () => {
      const target = { a: 1 }
      const returned = es6oa.assign(target, { b: 2 })
      expect(returned).toEqual({ a: 1, b: 2 })
    })

    it('works with functions', () => {
      // eslint-disable-next-line unicorn/consistent-function-scoping
      const target = () => {}
      ;(target as any).a = 1
      const returned = es6oa.assign(target, { b: 2 })
      expect(target).toBe(returned)
      expect(returned.a).toBe(1)
      expect(returned.b).toBe(2)
    })

    it('works with primitives', () => {
      const target = 2
      const source = { b: 42 }
      const returned = es6oa.assign(target, source)
      expect(Object.prototype.toString.call(returned)).toBe('[object Number]')
      expect(Number(returned)).toBe(target)
      expect(returned.b).toBe(source.b)
    })

    it('merge N objects', () => {
      const target = { a: 1 }
      const source1 = { b: 2 }
      const source2 = { c: 3 }
      const returned = es6oa.assign(target, source1, source2)
      expect(returned).toEqual({ a: 1, b: 2, c: 3 })
    })

    it('only iterates over own keys', () => {
      class Foo {}
      ;(Foo.prototype as any).bar = true
      const foo = new Foo()
      ;(foo as any).baz = true
      const target = { a: 1 }
      const returned = es6oa.assign(target, foo)
      expect(returned).toBe(target)
      expect(target).toEqual({ a: 1, baz: true })
    })

    it('includes enumerable symbols, after keys', () => {
      const visited: PropertyKey[] = []
      const obj = {}
      Object.defineProperty(obj, 'a', {
        enumerable: true,
        get() {
          visited.push('a')
          return 42
        },
      })
      const symbol = Symbol('enumerable')
      Object.defineProperty(obj, symbol, {
        enumerable: true,
        get() {
          visited.push(symbol)
          return Infinity
        },
      })
      const nonEnumSymbol = Symbol('non-enumerable')
      Object.defineProperty(obj, nonEnumSymbol, {
        enumerable: false,
        get() {
          visited.push(nonEnumSymbol)
          return -Infinity
        },
      })
      const target = es6oa.assign({}, obj)
      expect(visited).toEqual(['a', symbol])
      expect(target.a).toBe(42)
      expect(target[symbol]).toBe(Infinity)
      expect(target[nonEnumSymbol]).not.toBe(-Infinity)
    })

    it('does not fail when symbols are not present', () => {
      const visited: PropertyKey[] = []
      const obj = {}
      Object.defineProperty(obj, 'a', {
        enumerable: true,
        get() {
          visited.push('a')
          return 42
        },
      })
      const keys: PropertyKey[] = ['a']
      const symbol = Symbol('sym')
      Object.defineProperty(obj, symbol, {
        enumerable: true,
        get() {
          visited.push(symbol)
          return Infinity
        },
      })
      keys.push(symbol)
      const target = es6oa.assign({}, obj)
      expect(visited).toEqual(keys)
      expect(target.a).toBe(42)
      expect(target[symbol]).toBe(Infinity)
    })

    it('preserves correct property enumeration order', () => {
      /*
       * v8, specifically in node 4.x, has a bug with incorrect property enumeration order
       * note: this does not detect the bug unless there's 20 characters
       */
      const str = 'abcdefghijklmnopqrst'
      const letters = {}
      for (const letter of str.split('')) {
        ;(letters as any)[letter] = letter
      }
      const n = 5
      logger.info(`run the next test ${n} times`)
      const object = es6oa.assign({}, letters)
      let actual = ''
      for (const k in object) {
        actual += k
      }
      for (let i = 0; i < n; i += 1) {
        expect(actual).toBe(str)
      }
    })

    it('checks enumerability and existence, in case of modification during [[Get]]', () => {
      const targetBValue = {}
      const targetCValue = {}
      const target = { b: targetBValue, c: targetCValue }
      const source = {}
      Object.defineProperty(source, 'a', {
        enumerable: true,
        get() {
          delete this.b
          Object.defineProperty(this, 'c', { enumerable: false })
          return 'a'
        },
      })
      const sourceBValue = {}
      const sourceCValue = {}
      ;(source as any).b = sourceBValue
      ;(source as any).c = sourceCValue
      const result = es6oa.assign(target, source)
      expect(result).toBe(target)
      expect(result.b).toBe(targetBValue)
      expect(result.c).toBe(targetCValue)
    })
  },
)
