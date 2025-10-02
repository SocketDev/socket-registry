/**
 * @fileoverview Test for deep-equal package override.
 * Tests ported from https://github.com/inspect-js/node-deep-equal/blob/48d3bb5b7fe3e65fd564b737c69a9411eb40bc65/test/cmp.js
 */

import path from 'node:path'

import { beforeAll, describe, expect, it } from 'vitest'

import constants from '../../scripts/constants.mjs'
import { installPackageForTesting } from '../../scripts/utils/package.mjs'
import { isPackageTestingSkipped } from '../../scripts/utils/tests.mjs'

const { NPM } = constants

const eco = NPM
const sockRegPkgName = path.basename(__filename, '.test.mts')

// deep-equal package tests may have issues with test dependencies.
describe(
  `${eco} > ${sockRegPkgName}`,
  { skip: isPackageTestingSkipped(eco, sockRegPkgName) },
  () => {
    let pkgPath: string
    let deepEqual: any

    beforeAll(async () => {
      const result = await installPackageForTesting(sockRegPkgName)
      if (!result.installed) {
        throw new Error(`Failed to install package: ${result.reason}`)
      }
      pkgPath = result.packagePath!
      deepEqual = require(pkgPath)
    })

    it('should have valid package structure', () => {
      expect(pkgPath).toBeTruthy()
      expect(deepEqual).toBeDefined()
      expect(typeof deepEqual).toBe('function')
    })

    describe('equal', () => {
      it('two equal objects', () => {
        const obj1 = { a: [2, 3], b: [4] }
        const obj2 = { a: [2, 3], b: [4] }
        expect(deepEqual(obj1, obj2)).toBe(true)
        expect(deepEqual(obj1, obj2, { strict: true })).toBe(true)
      })

      it('two equal objects, in different order', () => {
        const obj1 = { a: [2, 3], b: [4] }
        const obj2 = { b: [4], a: [2, 3] }
        expect(deepEqual(obj1, obj2)).toBe(true)
        expect(deepEqual(obj1, obj2, { strict: true })).toBe(true)
      })

      it('two loosely equal, strictly inequal objects', () => {
        const obj1 = { a: 2, b: '4' }
        const obj2 = { a: 2, b: 4 }
        expect(deepEqual(obj1, obj2)).toBe(true)
        expect(deepEqual(obj1, obj2, { strict: true })).toBe(false)
      })

      it('two inequal objects', () => {
        const obj1 = { a: 2, b: 4 }
        const obj2 = { a: 2, B: 4 }
        expect(deepEqual(obj1, obj2)).toBe(false)
        expect(deepEqual(obj1, obj2, { strict: true })).toBe(false)
      })

      it('false and "-000"', () => {
        expect(deepEqual('-000', false)).toBe(true)
        expect(deepEqual('-000', false, { strict: true })).toBe(false)
      })
    })

    describe('Maps', () => {
      it('two equal Maps', () => {
        if (typeof Map !== 'function') {
          return
        }

        const map1 = new Map([
          ['a', 1],
          ['b', 2],
        ])
        const map2 = new Map([
          ['b', 2],
          ['a', 1],
        ])
        expect(deepEqual(map1, map2)).toBe(true)
        expect(deepEqual(map1, map2, { strict: true })).toBe(true)
      })

      it('two Maps with inequal values on the same key', () => {
        if (typeof Map !== 'function') {
          return
        }

        const map1 = new Map([['a', [1, 2]]])
        const map2 = new Map([['a', [2, 1]]])
        expect(deepEqual(map1, map2)).toBe(false)
        expect(deepEqual(map1, map2, { strict: true })).toBe(false)
      })

      it('two inequal Maps', () => {
        if (typeof Map !== 'function') {
          return
        }

        const map1 = new Map([['a', 1]])
        const map2 = new Map([['b', 1]])
        expect(deepEqual(map1, map2)).toBe(false)
        expect(deepEqual(map1, map2, { strict: true })).toBe(false)
      })

      it('two equal Maps in different orders with object keys', () => {
        if (typeof Map !== 'function') {
          return
        }

        const map1 = new Map([
          [{}, 3],
          [{}, 2],
          [{}, 1],
        ])
        const map2 = new Map([
          [{}, 1],
          [{}, 2],
          [{}, 3],
        ])
        expect(deepEqual(map1, map2)).toBe(true)
        expect(deepEqual(map1, map2, { strict: true })).toBe(true)
      })

      it('undefined keys, nullish values', () => {
        if (typeof Map !== 'function') {
          return
        }

        const map1 = new Map([[undefined, undefined]])
        const map2 = new Map([[undefined, null]])
        expect(deepEqual(map1, map2)).toBe(true)
        expect(deepEqual(map1, map2, { strict: true })).toBe(false)
      })

      it('nullish keys', () => {
        if (typeof Map !== 'function') {
          return
        }

        const map1 = new Map([[undefined, 3]])
        const map2 = new Map([[null, 3]])
        expect(deepEqual(map1, map2)).toBe(true)
        expect(deepEqual(map1, map2, { strict: true })).toBe(false)
      })
    })

    describe('Sets', () => {
      it('two equal Sets', () => {
        if (typeof Set !== 'function') {
          return
        }

        const set1 = new Set([1, 2, 3])
        const set2 = new Set([3, 2, 1])
        expect(deepEqual(set1, set2)).toBe(true)
        expect(deepEqual(set1, set2, { strict: true })).toBe(true)
      })

      it('two inequal Sets', () => {
        if (typeof Set !== 'function') {
          return
        }

        const set1 = new Set([1, 2, 3])
        const set2 = new Set([1, 2, 4])
        expect(deepEqual(set1, set2)).toBe(false)
        expect(deepEqual(set1, set2, { strict: true })).toBe(false)
      })

      it('two equal Sets with object values', () => {
        if (typeof Set !== 'function') {
          return
        }

        const set1 = new Set([{}, {}, {}])
        const set2 = new Set([{}, {}, {}])
        expect(deepEqual(set1, set2)).toBe(true)
        expect(deepEqual(set1, set2, { strict: true })).toBe(true)
      })
    })

    describe('non-objects', () => {
      it('primitives', () => {
        expect(deepEqual(3, 3)).toBe(true)
        expect(deepEqual(3, 3, { strict: true })).toBe(true)
        expect(deepEqual('beep', 'beep')).toBe(true)
        expect(deepEqual('beep', 'beep', { strict: true })).toBe(true)
        expect(deepEqual('3', 3)).toBe(true)
        expect(deepEqual('3', 3, { strict: true })).toBe(false)
        expect(deepEqual('3', [3])).toBe(true)
        expect(deepEqual('3', [3], { strict: true })).toBe(false)
      })
    })

    describe('infinities', () => {
      it('positive and negative infinity', () => {
        expect(deepEqual(Infinity, Infinity)).toBe(true)
        expect(deepEqual(Infinity, Infinity, { strict: true })).toBe(true)
        expect(deepEqual(-Infinity, -Infinity)).toBe(true)
        expect(deepEqual(-Infinity, -Infinity, { strict: true })).toBe(true)
        expect(deepEqual(Infinity, -Infinity)).toBe(false)
        expect(deepEqual(Infinity, -Infinity, { strict: true })).toBe(false)
      })
    })

    describe('Dates', () => {
      it('equal Dates', () => {
        const date1 = new Date(2000, 1, 1)
        const date2 = new Date(2000, 1, 1)
        expect(deepEqual(date1, date2)).toBe(true)
        expect(deepEqual(date1, date2, { strict: true })).toBe(true)
      })

      it('inequal Dates', () => {
        const date1 = new Date(2000, 1, 1)
        const date2 = new Date(2000, 1, 2)
        expect(deepEqual(date1, date2)).toBe(false)
        expect(deepEqual(date1, date2, { strict: true })).toBe(false)
      })

      it('Date and timestamp', () => {
        const date = new Date(2000, 1, 1)
        const timestamp = date.getTime()
        expect(deepEqual(date, timestamp)).toBe(true)
        expect(deepEqual(date, timestamp, { strict: true })).toBe(false)
      })
    })

    describe('buffers', () => {
      it('equal buffers', () => {
        if (typeof Buffer !== 'function') {
          return
        }

        const buf1 = Buffer.from('test')
        const buf2 = Buffer.from('test')
        expect(deepEqual(buf1, buf2)).toBe(true)
        expect(deepEqual(buf1, buf2, { strict: true })).toBe(true)
      })

      it('inequal buffers', () => {
        if (typeof Buffer !== 'function') {
          return
        }

        const buf1 = Buffer.from('test')
        const buf2 = Buffer.from('tset')
        expect(deepEqual(buf1, buf2)).toBe(false)
        expect(deepEqual(buf1, buf2, { strict: true })).toBe(false)
      })

      it('buffer and Uint8Array with same contents', () => {
        if (typeof Buffer !== 'function') {
          return
        }

        const buf = Buffer.from([1, 2, 3, 4])
        const arr = new Uint8Array([1, 2, 3, 4])
        expect(deepEqual(buf, arr)).toBe(true)
        expect(deepEqual(buf, arr, { strict: true })).toBe(true)
      })
    })

    describe('Arrays', () => {
      it('equal arrays', () => {
        expect(deepEqual([1, 2, 3], [1, 2, 3])).toBe(true)
        expect(deepEqual([1, 2, 3], [1, 2, 3], { strict: true })).toBe(true)
      })

      it('inequal arrays', () => {
        expect(deepEqual([1, 2, 3], [1, 2, 4])).toBe(false)
        expect(deepEqual([1, 2, 3], [1, 2, 4], { strict: true })).toBe(false)
      })

      it('arrays with different lengths', () => {
        expect(deepEqual([1, 2, 3], [1, 2])).toBe(false)
        expect(deepEqual([1, 2, 3], [1, 2], { strict: true })).toBe(false)
      })

      it('nested arrays', () => {
        expect(
          deepEqual(
            [
              [1, 2],
              [3, 4],
            ],
            [
              [1, 2],
              [3, 4],
            ],
          ),
        ).toBe(true)
        expect(
          deepEqual(
            [
              [1, 2],
              [3, 4],
            ],
            [
              [1, 2],
              [3, 4],
            ],
            { strict: true },
          ),
        ).toBe(true)
      })

      it('sparse arrays', () => {
        const arr1 = [1, , 3] // eslint-disable-line no-sparse-arrays
        const arr2 = [1, , 3] // eslint-disable-line no-sparse-arrays
        expect(deepEqual(arr1, arr2)).toBe(true)
        expect(deepEqual(arr1, arr2, { strict: true })).toBe(true)
      })
    })

    describe('booleans', () => {
      it('equal booleans', () => {
        expect(deepEqual(true, true)).toBe(true)
        expect(deepEqual(true, true, { strict: true })).toBe(true)
        expect(deepEqual(false, false)).toBe(true)
        expect(deepEqual(false, false, { strict: true })).toBe(true)
      })

      it('inequal booleans', () => {
        expect(deepEqual(true, false)).toBe(false)
        expect(deepEqual(true, false, { strict: true })).toBe(false)
      })

      it('boolean and number', () => {
        expect(deepEqual(true, 1)).toBe(true)
        expect(deepEqual(true, 1, { strict: true })).toBe(false)
        expect(deepEqual(false, 0)).toBe(true)
        expect(deepEqual(false, 0, { strict: true })).toBe(false)
      })
    })

    describe('null == undefined', () => {
      it('null and undefined', () => {
        expect(deepEqual(null, undefined)).toBe(true)
        expect(deepEqual(null, undefined, { strict: true })).toBe(false)
        expect(deepEqual(undefined, null)).toBe(true)
        expect(deepEqual(undefined, null, { strict: true })).toBe(false)
      })

      it('null and null', () => {
        expect(deepEqual(null, null)).toBe(true)
        expect(deepEqual(null, null, { strict: true })).toBe(true)
      })

      it('undefined and undefined', () => {
        expect(deepEqual(undefined, undefined)).toBe(true)
        expect(deepEqual(undefined, undefined, { strict: true })).toBe(true)
      })
    })

    describe('NaNs', () => {
      it('NaN and NaN', () => {
        expect(deepEqual(NaN, NaN)).toBe(true)
        expect(deepEqual(NaN, NaN, { strict: true })).toBe(true)
      })

      it('NaN and number', () => {
        expect(deepEqual(NaN, 0)).toBe(false)
        expect(deepEqual(NaN, 0, { strict: true })).toBe(false)
      })
    })

    describe('zeroes', () => {
      it('+0 and -0', () => {
        expect(deepEqual(+0, -0)).toBe(true)
        expect(deepEqual(+0, -0, { strict: true })).toBe(true)
      })

      it('0 and 0', () => {
        expect(deepEqual(0, 0)).toBe(true)
        expect(deepEqual(0, 0, { strict: true })).toBe(true)
      })
    })

    describe('Object.create', () => {
      it('objects with same prototype', () => {
        const proto = { a: 1 }
        const obj1 = Object.create(proto)
        const obj2 = Object.create(proto)
        obj1.b = 2
        obj2.b = 2
        expect(deepEqual(obj1, obj2)).toBe(true)
        expect(deepEqual(obj1, obj2, { strict: true })).toBe(true)
      })

      it('objects with different prototypes', () => {
        const proto1 = { a: 1 }
        const proto2 = { a: 2 }
        const obj1 = Object.create(proto1)
        const obj2 = Object.create(proto2)
        expect(deepEqual(obj1, obj2)).toBe(false)
        expect(deepEqual(obj1, obj2, { strict: true })).toBe(false)
      })

      it('Object.create(null)', () => {
        const obj1 = Object.create(null)
        const obj2 = Object.create(null)
        obj1.a = 1
        obj2.a = 1
        expect(deepEqual(obj1, obj2)).toBe(true)
        expect(deepEqual(obj1, obj2, { strict: true })).toBe(true)
      })
    })

    describe('regexen', () => {
      it('equal regexes', () => {
        expect(deepEqual(/abc/, /abc/)).toBe(true)
        expect(deepEqual(/abc/, /abc/, { strict: true })).toBe(true)
        expect(deepEqual(/abc/i, /abc/i)).toBe(true)
        expect(deepEqual(/abc/i, /abc/i, { strict: true })).toBe(true)
      })

      it('inequal regexes', () => {
        expect(deepEqual(/abc/, /abd/)).toBe(false)
        expect(deepEqual(/abc/, /abd/, { strict: true })).toBe(false)
        expect(deepEqual(/abc/, /abc/i)).toBe(false)
        expect(deepEqual(/abc/, /abc/i, { strict: true })).toBe(false)
      })

      it('regex and string', () => {
        expect(deepEqual(/abc/, 'abc')).toBe(false)
        expect(deepEqual(/abc/, 'abc', { strict: true })).toBe(false)
      })
    })

    describe('Errors', () => {
      it('equal errors', () => {
        const err1 = new Error('test')
        const err2 = new Error('test')
        expect(deepEqual(err1, err2)).toBe(true)
        expect(deepEqual(err1, err2, { strict: true })).toBe(true)
      })

      it('inequal errors', () => {
        const err1 = new Error('test1')
        const err2 = new Error('test2')
        expect(deepEqual(err1, err2)).toBe(false)
        expect(deepEqual(err1, err2, { strict: true })).toBe(false)
      })

      it('different error types', () => {
        const err1 = new Error('test')
        const err2 = new TypeError('test')
        expect(deepEqual(err1, err2)).toBe(false)
        expect(deepEqual(err1, err2, { strict: true })).toBe(false)
      })
    })

    describe('boxed primitives', () => {
      it('equal boxed strings', () => {
        expect(deepEqual(new String('test'), new String('test'))).toBe(true)
        expect(
          deepEqual(new String('test'), new String('test'), { strict: true }),
        ).toBe(true)
      })

      it('boxed string and primitive string', () => {
        expect(deepEqual(new String('test'), 'test')).toBe(true)
        expect(deepEqual(new String('test'), 'test', { strict: true })).toBe(
          false,
        )
      })

      it('equal boxed numbers', () => {
        expect(deepEqual(new Number(42), new Number(42))).toBe(true)
        expect(
          deepEqual(new Number(42), new Number(42), { strict: true }),
        ).toBe(true)
      })

      it('boxed number and primitive number', () => {
        expect(deepEqual(new Number(42), 42)).toBe(true)
        expect(deepEqual(new Number(42), 42, { strict: true })).toBe(false)
      })

      it('equal boxed booleans', () => {
        expect(deepEqual(new Boolean(true), new Boolean(true))).toBe(true)
        expect(
          deepEqual(new Boolean(true), new Boolean(true), { strict: true }),
        ).toBe(true)
      })

      it('boxed boolean and primitive boolean', () => {
        expect(deepEqual(new Boolean(true), true)).toBe(true)
        expect(deepEqual(new Boolean(true), true, { strict: true })).toBe(false)
      })
    })

    describe('circular references', () => {
      it('objects with circular references', () => {
        const obj1: any = { a: 1 }
        obj1.self = obj1
        const obj2: any = { a: 1 }
        obj2.self = obj2
        expect(deepEqual(obj1, obj2)).toBe(true)
        expect(deepEqual(obj1, obj2, { strict: true })).toBe(true)
      })

      it('arrays with circular references', () => {
        const arr1: any[] = [1, 2]
        arr1.push(arr1)
        const arr2: any[] = [1, 2]
        arr2.push(arr2)
        expect(deepEqual(arr1, arr2)).toBe(true)
        expect(deepEqual(arr1, arr2, { strict: true })).toBe(true)
      })
    })

    describe('TypedArrays', () => {
      it('equal Uint8Arrays', () => {
        const arr1 = new Uint8Array([1, 2, 3])
        const arr2 = new Uint8Array([1, 2, 3])
        expect(deepEqual(arr1, arr2)).toBe(true)
        expect(deepEqual(arr1, arr2, { strict: true })).toBe(true)
      })

      it('inequal Uint8Arrays', () => {
        const arr1 = new Uint8Array([1, 2, 3])
        const arr2 = new Uint8Array([1, 2, 4])
        expect(deepEqual(arr1, arr2)).toBe(false)
        expect(deepEqual(arr1, arr2, { strict: true })).toBe(false)
      })

      it('different TypedArray types with same values', () => {
        const arr1 = new Uint8Array([1, 2, 3])
        const arr2 = new Int8Array([1, 2, 3])
        expect(deepEqual(arr1, arr2)).toBe(false)
        expect(deepEqual(arr1, arr2, { strict: true })).toBe(false)
      })
    })

    describe('ArrayBuffers', () => {
      it('equal ArrayBuffers', () => {
        if (typeof ArrayBuffer !== 'function') {
          return
        }

        const buf1 = new ArrayBuffer(8)
        const buf2 = new ArrayBuffer(8)
        expect(deepEqual(buf1, buf2)).toBe(true)
        expect(deepEqual(buf1, buf2, { strict: true })).toBe(true)
      })

      it('inequal ArrayBuffers', () => {
        if (typeof ArrayBuffer !== 'function') {
          return
        }

        const buf1 = new ArrayBuffer(8)
        const buf2 = new ArrayBuffer(8)
        const view1 = new Int8Array(buf1)
        view1[0] = 1
        expect(deepEqual(buf1, buf2)).toBe(false)
        expect(deepEqual(buf1, buf2, { strict: true })).toBe(false)
      })

      it('ArrayBuffers with different lengths', () => {
        if (typeof ArrayBuffer !== 'function') {
          return
        }

        const buf1 = new ArrayBuffer(8)
        const buf2 = new ArrayBuffer(16)
        expect(deepEqual(buf1, buf2)).toBe(false)
        expect(deepEqual(buf1, buf2, { strict: true })).toBe(false)
      })
    })
  },
)
