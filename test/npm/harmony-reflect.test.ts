import path from 'node:path'

import { beforeAll, describe, expect, it } from 'vitest'

import constants from '../../scripts/constants'
import { installPackageForTesting } from '../../scripts/lib/package-utils'
import { isPackageTestingSkipped } from '../../scripts/lib/tests'

const { NPM } = constants

const eco = NPM
const sockRegPkgName = path.basename(__filename, '.test.ts')

// harmony-reflect has known failures in its package and requires running tests in browser.
// https://github.com/tvcutsem/harmony-reflect/tree/v1.6.2/test
describe(
  `${eco} > ${sockRegPkgName}`,
  { skip: isPackageTestingSkipped(eco, sockRegPkgName) },
  () => {
    let pkgPath: string
    let harmonyReflect: any

    beforeAll(async () => {
      const result = await installPackageForTesting(sockRegPkgName)
      if (!result.installed) {
        throw new Error(`Failed to install package: ${result.reason}`)
      }
      pkgPath = result.packagePath!
      harmonyReflect = require(path.join(pkgPath, 'index.js'))
    })

    it('should be able to define a property', () => {
      const obj: {
        [key: string]: any
      } = {}
      harmonyReflect.defineProperty(obj, 'x', { value: 1 })
      expect(obj['x']).toBe(1)
    })

    it('should correctly implement getOwnPropertyDescriptor', () => {
      expect(harmonyReflect.getOwnPropertyDescriptor({ x: 1 }, 'x').value).toBe(
        1,
      )
      expect(harmonyReflect.getOwnPropertyDescriptor({ x: 1 }, 'y')).toBe(
        undefined,
      )
    })

    it('should correctly implement defineProperty', () => {
      const target: {
        [key: string]: any
      } = { x: 1 }
      expect(harmonyReflect.defineProperty(target, 'x', { value: 2 })).toBe(
        true,
      )
      expect(target['x']).toBe(2)
      expect(harmonyReflect.defineProperty(target, 'y', { value: 3 })).toBe(
        true,
      )
      expect(target['y']).toBe(3)
      Object.defineProperty(target, 'z', {
        value: 0,
        writable: false,
        configurable: false,
      })
      expect(harmonyReflect.defineProperty(target, 'z', { value: 1 })).toBe(
        false,
      )
      expect(target['z']).toBe(0)
    })

    it('should correctly implement ownKeys', () => {
      const target = Object.create(Object.prototype, {
        x: { value: 1, enumerable: true },
        y: { value: 2, enumerable: false },
        z: { get: () => undefined, enumerable: true },
      })
      const result = harmonyReflect.ownKeys(target)
      expect(result.length).toBe(3)
      expect(result.indexOf('x')).not.toBe(-1)
      expect(result.indexOf('y')).not.toBe(-1)
      expect(result.indexOf('z')).not.toBe(-1)
    })

    it('should correctly implement deleteProperty', () => {
      const target = Object.create(Object.prototype, {
        x: { value: 1, configurable: true },
        y: { value: 2, configurable: false },
      })
      expect(harmonyReflect.deleteProperty(target, 'x')).toBe(true)
      expect(target.x).toBe(undefined)
      expect(harmonyReflect.deleteProperty(target, 'y')).toBe(false)
      expect(target.y).toBe(2)
    })

    it('should correctly implement preventExtensions', () => {
      const target = { x: 1 }
      expect(harmonyReflect.preventExtensions(target)).toBe(true)
      expect(Object.isExtensible(target)).toBe(false)
      const desc = harmonyReflect.getOwnPropertyDescriptor(target, 'x')
      expect(desc.configurable).toBe(true)
      expect(desc.writable).toBe(true)
    })

    it('should correctly implement has', () => {
      const proto = { x: 1 }
      const target = Object.create(proto, { y: { value: 2 } })
      expect(harmonyReflect.has(target, 'x')).toBe(true)
      expect(harmonyReflect.has(target, 'y')).toBe(true)
      expect(harmonyReflect.has(target, 'z')).toBe(false)
    })

    it('should correctly implement get', () => {
      const target = Object.create(
        {
          z: 3,
          get w() {
            return this
          },
        },
        {
          x: { value: 1 },
          y: {
            get() {
              return this
            },
          },
        },
      )
      const receiver = {}
      expect(harmonyReflect.get(target, 'x', receiver)).toBe(1)
      expect(harmonyReflect.get(target, 'y', receiver)).toBe(receiver)
      expect(harmonyReflect.get(target, 'z', receiver)).toBe(3)
      expect(harmonyReflect.get(target, 'w', receiver)).toBe(receiver)
      expect(harmonyReflect.get(target, 'u', receiver)).toBe(undefined)
    })

    it('should correctly implement set', () => {
      let out
      const target = Object.create(
        {
          z: 3,
          set w(_v: any) {
            // eslint-disable-next-line @typescript-eslint/no-this-alias
            out = this
          },
        },
        {
          x: { value: 1, writable: true, configurable: true },
          y: {
            set: function (_v) {
              // eslint-disable-next-line @typescript-eslint/no-this-alias
              out = this
            },
          },
          c: { value: 1, writable: false, configurable: false },
        },
      )

      expect(harmonyReflect.set(target, 'x', 2, target)).toBe(true)
      expect(target.x).toBe(2)

      out = null
      expect(harmonyReflect.set(target, 'y', 1, target)).toBe(true)
      expect(out).toBe(target)

      expect(harmonyReflect.set(target, 'z', 4, target)).toBe(true)
      expect(target.z).toBe(4)

      out = null
      expect(harmonyReflect.set(target, 'w', 1, target)).toBe(true)
      expect(out).toBe(target)

      expect(harmonyReflect.set(target, 'u', 0, target)).toBe(true)
      expect(target.u).toBe(0)

      expect(harmonyReflect.set(target, 'c', 2, target)).toBe(false)
      expect(target.c).toBe(1)
    })

    it('should correctly implement apply', () => {
      expect(
        harmonyReflect.apply(
          function (x: number) {
            return x
          },
          undefined,
          [1],
        ),
      ).toBe(1)

      const receiver = {}
      expect(
        harmonyReflect.apply(
          function (this: any) {
            return this
          },
          receiver,
          [],
        ),
      ).toBe(receiver)
    })

    it('should correctly implement construct', () => {
      expect(
        harmonyReflect.construct(
          function (x: number) {
            return x
          },
          [1],
        ),
      ).not.toBe(1)
      expect(
        harmonyReflect.construct(
          function (this: { x: number }, x: number) {
            this.x = x
          },
          [1, 2, 3],
        ).x,
      ).toBe(1)
    })

    it('should correctly implement setPrototypeOf', () => {
      try {
        harmonyReflect.setPrototypeOf({}, {})
      } catch (e) {
        if (
          (e as Error)?.message ===
          'setPrototypeOf not supported on this platform'
        ) {
          return
        } else {
          throw e
        }
      }

      const oldProto = {}
      const target = Object.create(oldProto)
      const newProto = {}
      harmonyReflect.setPrototypeOf(target, newProto)
      expect(harmonyReflect.getPrototypeOf(target)).toBe(newProto)
      expect(() => {
        harmonyReflect.setPrototypeOf(target, undefined)
      }).toThrow('Object prototype may only be an Object or null: undefined')
    })

    it('should correctly implement [[Construct]] newTarget', () => {
      // eslint-disable-next-line unicorn/consistent-function-scoping
      function Super(this: any) {
        this.x = 42
      }
      // eslint-disable-next-line unicorn/consistent-function-scoping
      function Sub() {}
      class ES2015Class {
        prop: string
        constructor() {
          this.prop = 'someValue'
        }
      }
      const instance: any = harmonyReflect.construct(Super, [], Sub)
      expect(instance.x).toBe(42)
      expect(Object.getPrototypeOf(instance)).toBe(Sub.prototype)

      const instance2: any = harmonyReflect.construct(Super, [])
      expect(instance2.x).toBe(42)
      expect(Object.getPrototypeOf(instance2)).toBe(Super.prototype)

      const instance3: any = harmonyReflect.construct(ES2015Class, [])
      expect(instance3.prop).toBe('someValue')
      expect(Object.getPrototypeOf(instance3)).toBe(ES2015Class.prototype)

      expect(() => {
        harmonyReflect.construct(ES2015Class, [], Sub)
      }).not.toThrow()
    })
  },
)
