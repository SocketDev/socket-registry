/**
 * @fileoverview Test for object-keys package override.
 * Tests ported from https://github.com/ljharb/object-keys/blob/ba2c1989270c7de969aa8498fc3b7c8e677806f3/test/shim.js
 */

import path from 'node:path'

import { beforeAll, describe, expect, it } from 'vitest'

import constants from '../../scripts/constants.mjs'
import { installPackageForTesting } from '../../scripts/utils/package.mjs'

const { NPM } = constants

const eco = NPM
const sockRegPkgName = path.basename(__filename, '.test.mts')

describe(`${eco} > ${sockRegPkgName}`, () => {
  let pkgPath: string
  let objectKeys: any

  beforeAll(async () => {
    const result = await installPackageForTesting(sockRegPkgName)
    if (!result.installed) {
      throw new Error(`Failed to install package: ${result.reason}`)
    }
    pkgPath = result.packagePath!
    objectKeys = require(pkgPath)
  })

  it('should have valid package structure', () => {
    expect(pkgPath).toBeTruthy()
    expect(objectKeys).toBeDefined()
    expect(typeof objectKeys).toBe('function')
  })

  describe('basic functionality', () => {
    it('should work with an object literal', () => {
      const obj = {
        aNull: null,
        arr: [],
        bool: true,
        num: 42,
        obj: {},
        str: 'boz',
        undef: undefined,
      }
      const keys = objectKeys(obj)
      expect(Array.isArray(keys)).toBe(true)
      expect(keys).toEqual([
        'aNull',
        'arr',
        'bool',
        'num',
        'obj',
        'str',
        'undef',
      ])
    })

    it('should work with an array', () => {
      const arr = [1, 2, 3]
      const keys = objectKeys(arr)
      expect(Array.isArray(keys)).toBe(true)
      expect(keys).toEqual(['0', '1', '2'])
    })

    it('should work with an arguments object', () => {
      // eslint-disable-next-line unicorn/consistent-function-scoping
      function testArgs(_a: any, _b: any, _c: any) {
        const keys = objectKeys(arguments)
        expect(keys).toEqual(['0', '1', '2'])
      }
      testArgs(1, 2, 3)
    })

    it('should work with a boxed primitive', () => {
      expect(objectKeys(Object('hello'))).toEqual(['0', '1', '2', '3', '4'])

      expect(objectKeys(new String('hello'))).toEqual(['0', '1', '2', '3', '4'])

      const x = new String('x')
      ;(x as any).y = 1
      expect(objectKeys(x).sort()).toEqual(['0', 'y'].sort())
    })

    it('should work with a function', () => {
      // eslint-disable-next-line unicorn/consistent-function-scoping
      const foo = function () {}
      ;(foo as any).a = true

      expect(() => objectKeys(foo)).not.toThrow()
      expect(objectKeys(foo)).toEqual(['a'])
    })
  })

  describe('property filtering', () => {
    it('should return only own properties', () => {
      const obj = {
        a: 1,
        b: 2,
        c: 3,
      }
      const keys = objectKeys(obj)
      for (const key of keys) {
        expect(Object.prototype.hasOwnProperty.call(obj, key)).toBe(true)
      }
    })

    it('should return only enumerable properties', () => {
      const obj = { __proto__: null, a: 1, b: 2, c: 3 }
      const loopedValues: string[] = []
      for (const k in obj) {
        if (Object.prototype.propertyIsEnumerable.call(obj, k)) {
          loopedValues.push(k)
        }
      }
      const keys = objectKeys(obj)
      for (const key of keys) {
        expect(loopedValues).toContain(key)
      }
    })

    it('should work with an object instance', () => {
      class Prototype {
        foo: boolean = true
      }
      const instance: any = new Prototype()
      instance.bar = true
      const keys = objectKeys(instance)
      expect(Array.isArray(keys)).toBe(true)
      expect(keys.sort()).toEqual(['bar', 'foo'].sort())
    })
  })

  describe('shadowed properties', () => {
    it('should handle shadowed properties correctly', () => {
      const shadowedProps = [
        'constructor',
        'dummyControlProp',
        'hasOwnProperty',
        'isPrototypeOf',
        'propertyIsEnumerable',
        'toLocaleString',
        'toString',
        'valueOf',
      ]
      shadowedProps.sort()
      const shadowedObject: any = { __proto__: null }
      for (let i = 0; i < shadowedProps.length; i += 1) {
        shadowedObject[shadowedProps[i]!] = i
      }
      const keys = objectKeys(shadowedObject)
      keys.sort()
      expect(keys).toEqual(shadowedProps)
    })
  })

  describe('edge cases', () => {
    it('should throw for non-objects', () => {
      expect(() => objectKeys(null)).toThrow(TypeError)
      expect(() => objectKeys(undefined)).toThrow(TypeError)
    })

    it('should work in iOS 5 mobile Safari scenario', () => {
      // eslint-disable-next-line unicorn/consistent-function-scoping
      const Foo: any = function () {}
      Foo.a = function () {}
      expect(objectKeys(Foo)).toEqual(['a'])
    })

    it('should work in environments with the dontEnum bug', () => {
      // eslint-disable-next-line unicorn/consistent-function-scoping
      const Foo = function () {}
      Foo.prototype.a = function () {}
      expect(objectKeys(Foo.prototype)).toContain('a')
    })
  })

  describe('shim functionality', () => {
    it('should have a shim method', () => {
      expect(typeof objectKeys.shim).toBe('function')
    })
  })
})
