/**
 * @fileoverview Tests for function-bind NPM package override.
 * Ported 1:1 from upstream v1.1.2 (40197beb5f4cf89dd005f0b268256c1e4716ea81):
 * https://github.com/Raynos/function-bind/blob/40197beb5f4cf89dd005f0b268256c1e4716ea81/test/index.js
 */

import { describe, expect, it } from 'vitest'

import { setupNpmPackageTest } from '../util/npm-package-helper.mts'

const {
  eco,
  module: functionBind,
  skip,
  sockRegPkgName,
} = await setupNpmPackageTest(import.meta.url)

const getCurrentContext = function (this: unknown) {
  return this
}

describe(`${eco} > ${sockRegPkgName}`, { skip }, () => {
  it('is a function', () => {
    expect(typeof functionBind).toBe('function')
  })

  describe('non-functions', () => {
    it('throws TypeError for non-function values', () => {
      const nonFunctions = [true, false, [], {}, 42, 'foo', NaN, /a/g]
      for (let i = 0, { length } = nonFunctions; i < length; i += 1) {
        const nonFunction = nonFunctions[i]
        expect(() => functionBind.call(nonFunction)).toThrow(TypeError)
      }
    })
  })

  describe('without a context', () => {
    it('binds properly', () => {
      let args: unknown[] = []
      let context: unknown
      const namespace = {
        func: functionBind.call(function (this: unknown, ...a: unknown[]) {
          args = a
          // eslint-disable-next-line @typescript-eslint/no-this-alias
          context = this
        }),
      }
      namespace.func(1, 2, 3)
      expect(args).toEqual([1, 2, 3])
      expect(context).toBe(getCurrentContext.call(undefined))
    })

    it('binds properly, and still supplies bound arguments', () => {
      let args: unknown[] = []
      let context: unknown
      const namespace = {
        func: functionBind.call(
          function (this: unknown, ...a: unknown[]) {
            args = a
            // eslint-disable-next-line @typescript-eslint/no-this-alias
            context = this
          },
          undefined,
          1,
          2,
          3,
        ),
      }
      namespace.func(4, 5, 6)
      expect(args).toEqual([1, 2, 3, 4, 5, 6])
      expect(context).toBe(getCurrentContext.call(undefined))
    })

    it('returns properly', () => {
      let args: unknown[] = []
      const namespace = {
        func: functionBind.call(function (this: unknown, ...a: unknown[]) {
          args = a
          return this
        }, undefined),
      }
      const context = namespace.func(1, 2, 3)
      expect(context).toBe(getCurrentContext.call(undefined))
      expect(args).toEqual([1, 2, 3])
    })

    it('returns properly with bound arguments', () => {
      let args: unknown[] = []
      const namespace = {
        func: functionBind.call(
          function (this: unknown, ...a: unknown[]) {
            args = a
            return this
          },
          undefined,
          1,
          2,
          3,
        ),
      }
      const context = namespace.func(4, 5, 6)
      expect(context).toBe(getCurrentContext.call(undefined))
      expect(args).toEqual([1, 2, 3, 4, 5, 6])
    })

    describe('called as a constructor', () => {
      const thunkify = (value: unknown) => {
        return function () {
          return value
        }
      }

      it('returns object value', () => {
        const expectedReturnValue = [1, 2, 3]
        const Constructor = functionBind.call(
          thunkify(expectedReturnValue),
          undefined,
        )
        const result = new Constructor()
        expect(result).toBe(expectedReturnValue)
      })

      it('does not return primitive value', () => {
        const Constructor = functionBind.call(thunkify(42), undefined)
        const result = new Constructor()
        expect(result).not.toBe(42)
      })

      it('object from bound constructor is instance of original and bound constructor', () => {
        const A = function (this: any, x?: string) {
          this.name = x || 'A'
        }
        const B = functionBind.call(A, undefined, 'B')

        const result = new B()
        expect(result instanceof B).toBe(true)
        expect(result instanceof A).toBe(true)
      })
    })
  })

  describe('with a context', () => {
    it('with no bound arguments', () => {
      let args: unknown[] = []
      let context: unknown
      const boundContext = {}
      const namespace = {
        func: functionBind.call(function (this: unknown, ...a: unknown[]) {
          args = a
          // eslint-disable-next-line @typescript-eslint/no-this-alias
          context = this
        }, boundContext),
      }
      namespace.func(1, 2, 3)
      expect(context).toBe(boundContext)
      expect(args).toEqual([1, 2, 3])
    })

    it('with bound arguments', () => {
      let args: unknown[] = []
      let context: unknown
      const boundContext = {}
      const namespace = {
        func: functionBind.call(
          function (this: unknown, ...a: unknown[]) {
            args = a
            // eslint-disable-next-line @typescript-eslint/no-this-alias
            context = this
          },
          boundContext,
          1,
          2,
          3,
        ),
      }
      namespace.func(4, 5, 6)
      expect(context).toBe(boundContext)
      expect(args).toEqual([1, 2, 3, 4, 5, 6])
    })

    it('returns properly', () => {
      const boundContext = {}
      let args: unknown[] = []
      const namespace = {
        func: functionBind.call(function (this: unknown, ...a: unknown[]) {
          args = a
          return this
        }, boundContext),
      }
      const context = namespace.func(1, 2, 3)
      expect(context).toBe(boundContext)
      expect(context).not.toBe(getCurrentContext.call(undefined))
      expect(args).toEqual([1, 2, 3])
    })

    it('returns properly with bound arguments', () => {
      const boundContext = {}
      let args: unknown[] = []
      const namespace = {
        func: functionBind.call(
          function (this: unknown, ...a: unknown[]) {
            args = a
            return this
          },
          boundContext,
          1,
          2,
          3,
        ),
      }
      const context = namespace.func(4, 5, 6)
      expect(context).toBe(boundContext)
      expect(context).not.toBe(getCurrentContext.call(undefined))
      expect(args).toEqual([1, 2, 3, 4, 5, 6])
    })

    it('passes the correct arguments when called as a constructor', () => {
      const expected = { name: 'Correct' }
      const namespace = {
        Func: functionBind.call(
          function (arg: unknown) {
            return arg
          },
          { name: 'Incorrect' },
        ),
      }
      const returned = new namespace.Func(expected)
      expect(returned).toBe(expected)
    })

    it("has the new instance's context when called as a constructor", () => {
      let actualContext: unknown
      const expectedContext = { foo: 'bar' }
      const namespace = {
        Func: functionBind.call(function (this: unknown) {
          // eslint-disable-next-line @typescript-eslint/no-this-alias
          actualContext = this
        }, expectedContext),
      }
      const result = new namespace.Func()
      expect(result instanceof namespace.Func).toBe(true)
      expect(actualContext).not.toBe(expectedContext)
    })
  })

  describe('bound function length', () => {
    it('sets a correct length without thisArg', () => {
      const subject = functionBind.call(
        (a: number, b: number, c: number) => a + b + c,
      )
      expect(subject.length).toBe(3)
      expect(subject(1, 2, 3)).toBe(6)
    })

    it('sets a correct length with thisArg', () => {
      const subject = functionBind.call(
        (a: number, b: number, c: number) => a + b + c,
        {},
      )
      expect(subject.length).toBe(3)
      expect(subject(1, 2, 3)).toBe(6)
    })

    it('sets a correct length without thisArg and first argument', () => {
      const subject = functionBind.call(
        (a: number, b: number, c: number) => a + b + c,
        undefined,
        1,
      )
      expect(subject.length).toBe(2)
      expect(subject(2, 3)).toBe(6)
    })

    it('sets a correct length with thisArg and first argument', () => {
      const subject = functionBind.call(
        (a: number, b: number, c: number) => a + b + c,
        {},
        1,
      )
      expect(subject.length).toBe(2)
      expect(subject(2, 3)).toBe(6)
    })

    it('sets a correct length without thisArg and too many arguments', () => {
      const subject = functionBind.call(
        (a: number, b: number, c: number) => a + b + c,
        undefined,
        1,
        2,
        3,
        4,
      )
      expect(subject.length).toBe(0)
      expect(subject()).toBe(6)
    })

    it('sets a correct length with thisArg and too many arguments', () => {
      const subject = functionBind.call(
        (a: number, b: number, c: number) => a + b + c,
        {},
        1,
        2,
        3,
        4,
      )
      expect(subject.length).toBe(0)
      expect(subject()).toBe(6)
    })
  })
})
