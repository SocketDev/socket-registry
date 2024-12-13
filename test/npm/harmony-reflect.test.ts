import assert from 'node:assert/strict'
import path from 'node:path'
import { describe, it } from 'node:test'

import { resolveOriginalPackageName } from '@socketsecurity/registry/lib/packages'
import { isPackageTestingSkipped } from '@socketregistry/scripts/lib/tests'

const eco = 'npm'
const regPkgName = path.basename(__filename, '.test.ts')

// harmony-reflect has known failures in its package and requires running tests in browser.
// https://github.com/tvcutsem/harmony-reflect/tree/v1.6.2/test
describe(
  `${eco} > ${regPkgName}`,
  { skip: isPackageTestingSkipped(eco, regPkgName) },
  () => {
    const harmonyReflect = require(resolveOriginalPackageName(regPkgName))

    it('should be able to define a property', () => {
      const obj: {
        [key: string]: any
      } = {}
      harmonyReflect.defineProperty(obj, 'x', { value: 1 })
      assert.strictEqual(obj['x'], 1, 'defineProperty should work')
    })

    it('should correctly implement getOwnPropertyDescriptor', () => {
      assert.strictEqual(
        harmonyReflect.getOwnPropertyDescriptor({ x: 1 }, 'x').value,
        1,
        'getOwnPropertyDescriptor existent property'
      )
      assert.strictEqual(
        harmonyReflect.getOwnPropertyDescriptor({ x: 1 }, 'y'),
        undefined,
        'getOwnPropertyDescriptor non-existent property'
      )
    })

    it('should correctly implement defineProperty', () => {
      const target: {
        [key: string]: any
      } = { x: 1 }
      assert.strictEqual(
        harmonyReflect.defineProperty(target, 'x', { value: 2 }),
        true
      )
      assert.strictEqual(target['x'], 2, 'defineProperty update success')
      assert.strictEqual(
        harmonyReflect.defineProperty(target, 'y', { value: 3 }),
        true
      )
      assert.strictEqual(target['y'], 3, 'defineProperty addition success')
      Object.defineProperty(target, 'z', {
        value: 0,
        writable: false,
        configurable: false
      })
      assert.strictEqual(
        harmonyReflect.defineProperty(target, 'z', { value: 1 }),
        false
      )
      assert.strictEqual(target['z'], 0, 'defineProperty update failure')
    })

    it('should correctly implement ownKeys', () => {
      const target = Object.create(Object.prototype, {
        x: { value: 1, enumerable: true },
        y: { value: 2, enumerable: false },
        z: { get() {}, enumerable: true }
      })
      const result = harmonyReflect.ownKeys(target)
      assert.strictEqual(result.length, 3)
      assert.notStrictEqual(result.indexOf('x'), -1)
      assert.notStrictEqual(result.indexOf('y'), -1)
      assert.notStrictEqual(result.indexOf('z'), -1)
    })

    it('should correctly implement deleteProperty', () => {
      const target = Object.create(Object.prototype, {
        x: { value: 1, configurable: true },
        y: { value: 2, configurable: false }
      })
      assert.strictEqual(harmonyReflect.deleteProperty(target, 'x'), true)
      assert.strictEqual(target.x, undefined, 'deleteProperty success')
      assert.strictEqual(harmonyReflect.deleteProperty(target, 'y'), false)
      assert.strictEqual(target.y, 2, 'deleteProperty failure')
    })

    it('should correctly implement preventExtensions', () => {
      const target = { x: 1 }
      assert.strictEqual(
        harmonyReflect.preventExtensions(target),
        true,
        'pE success'
      )
      assert.strictEqual(
        Object.isExtensible(target),
        false,
        'pE -> non-extensible'
      )
      const desc = harmonyReflect.getOwnPropertyDescriptor(target, 'x')
      assert.strictEqual(desc.configurable, true, 'pE -/-> non-configurable')
      assert.strictEqual(desc.writable, true, 'pE -/-> non-writable')
    })

    it('should correctly implement has', () => {
      const proto = { x: 1 }
      const target = Object.create(proto, { y: { value: 2 } })
      assert.strictEqual(harmonyReflect.has(target, 'x'), true, 'has proto ok')
      assert.strictEqual(harmonyReflect.has(target, 'y'), true, 'has own ok')
      assert.strictEqual(harmonyReflect.has(target, 'z'), false, 'has failure')
    })

    it('should correctly implement get', () => {
      const target = Object.create(
        {
          z: 3,
          get w() {
            return this
          }
        },
        {
          x: { value: 1 },
          y: {
            get() {
              return this
            }
          }
        }
      )
      const receiver = {}
      assert.strictEqual(harmonyReflect.get(target, 'x', receiver), 1, 'get x')
      assert.strictEqual(
        harmonyReflect.get(target, 'y', receiver),
        receiver,
        'get y'
      )
      assert.strictEqual(harmonyReflect.get(target, 'z', receiver), 3, 'get z')
      assert.strictEqual(
        harmonyReflect.get(target, 'w', receiver),
        receiver,
        'get w'
      )
      assert.strictEqual(
        harmonyReflect.get(target, 'u', receiver),
        undefined,
        'get u'
      )
    })

    it('should correctly implement set', () => {
      let out
      const target = Object.create(
        {
          z: 3,
          set w(_v: any) {
            // eslint-disable-next-line @typescript-eslint/no-this-alias
            out = this
          }
        },
        {
          x: { value: 1, writable: true, configurable: true },
          y: {
            set: function (_v) {
              // eslint-disable-next-line @typescript-eslint/no-this-alias
              out = this
            }
          },
          c: { value: 1, writable: false, configurable: false }
        }
      )

      assert.strictEqual(harmonyReflect.set(target, 'x', 2, target), true)
      assert.strictEqual(target.x, 2, 'set x')

      out = null
      assert.strictEqual(harmonyReflect.set(target, 'y', 1, target), true)
      assert.strictEqual(out, target, 'set y')

      assert.strictEqual(harmonyReflect.set(target, 'z', 4, target), true)
      assert.strictEqual(target.z, 4, 'set z')

      out = null
      assert.strictEqual(harmonyReflect.set(target, 'w', 1, target), true)
      assert.strictEqual(out, target, 'set w')

      assert.strictEqual(harmonyReflect.set(target, 'u', 0, target), true)
      assert.strictEqual(target.u, 0, 'set u')

      assert.strictEqual(harmonyReflect.set(target, 'c', 2, target), false)
      assert.strictEqual(target.c, 1, 'set c')
    })

    it('should correctly implement apply', () => {
      assert.strictEqual(
        harmonyReflect.apply(
          function (x: number) {
            return x
          },
          undefined,
          [1]
        ),
        1,
        'apply identity'
      )

      const receiver = {}
      assert.strictEqual(
        harmonyReflect.apply(
          function (this: any) {
            return this
          },
          receiver,
          []
        ),
        receiver,
        'apply this'
      )
    })

    it('should correctly implement construct', () => {
      assert.notStrictEqual(
        harmonyReflect.construct(
          function (x: number) {
            return x
          },
          [1]
        ),
        1,
        'construct identity'
      )
      assert.strictEqual(
        harmonyReflect.construct(
          function (this: { x: number }, x: number) {
            this.x = x
          },
          [1, 2, 3]
        ).x,
        1,
        'construct this'
      )
    })

    it('should correctly implement setPrototypeOf', () => {
      try {
        harmonyReflect.setPrototypeOf({}, {})
      } catch (e: any) {
        if (e?.message === 'setPrototypeOf not supported on this platform') {
          return
        } else {
          throw e
        }
      }

      const oldProto = {}
      const target = Object.create(oldProto)
      const newProto = {}
      harmonyReflect.setPrototypeOf(target, newProto)
      assert.strictEqual(harmonyReflect.getPrototypeOf(target), newProto)
      assert.throws(
        () => {
          harmonyReflect.setPrototypeOf(target, undefined)
        },
        {
          message: 'Object prototype may only be an Object or null: undefined'
        }
      )
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
      assert.strictEqual(
        instance.x,
        42,
        'construct correctly initializes instance when using newTarget'
      )
      assert.strictEqual(
        Object.getPrototypeOf(instance),
        Sub.prototype,
        'instance prototype === newTarget'
      )

      const instance2: any = harmonyReflect.construct(Super, [])
      assert.strictEqual(
        instance2.x,
        42,
        'construct correctly initializes instance with default newTarget'
      )
      assert.strictEqual(
        Object.getPrototypeOf(instance2),
        Super.prototype,
        'newTarget defaults to target'
      )

      const instance3: any = harmonyReflect.construct(ES2015Class, [])
      assert.strictEqual(
        instance3.prop,
        'someValue',
        'correctly instantiates ES2015 classes 1/2'
      )
      assert.strictEqual(
        Object.getPrototypeOf(instance3),
        ES2015Class.prototype,
        'correctly instantiates ES2015 classes 2/2'
      )

      assert.doesNotThrow(() => {
        harmonyReflect.construct(ES2015Class, [], Sub)
      })
    })
  }
)
