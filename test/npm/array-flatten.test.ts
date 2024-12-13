import assert from 'node:assert/strict'
import path from 'node:path'
import { describe, it } from 'node:test'

import { isPackageTestingSkipped } from '@socketregistry/scripts/lib/tests'

const eco = 'npm'
const regPkgName = path.basename(__filename, '.test.ts')

describe(
  `${eco} > ${regPkgName}`,
  { skip: isPackageTestingSkipped(eco, regPkgName) },
  () => {
    const flattenLegacy = require(regPkgName)
    const { flatten } = require(regPkgName)

    // array-flatten v3 unit tests.
    // https://github.com/blakeembrey/array-flatten/blob/v3.0.0/src/index.spec.ts
    describe('v3 API', () => {
      it('should flatten an array', () => {
        const result = flatten([1, [2, [3, [4, [5]]], 6, [[7], 8], 9], 10])

        assert.deepStrictEqual(result, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
      })

      it('should work with array-like', () => {
        const result = flatten('test')

        assert.deepStrictEqual(result, ['t', 'e', 's', 't'])
      })

      it('should work with readonly array', () => {
        const input = [1, [2, [3, [4]]]] as const
        const result = flatten(input)

        assert.deepStrictEqual(result, [1, 2, 3, 4])
      })

      it('should work with arguments', () => {
        const input = (function () {
          return arguments
        })()
        const result = flatten(input)

        assert.deepStrictEqual(result, [])
      })

      it('should work with mixed types', () => {
        // eslint-disable-next-line unicorn/consistent-function-scoping
        const fn = (x: string) => x
        const input = [1, ['test', [fn, [true]]]]
        const result = flatten(input)

        assert.deepStrictEqual(result, [1, 'test', fn, true])
      })

      it('should work with tuples', () => {
        const input: [number, [number, number], [number]] = [1, [1, 2], [3]]
        const result = flatten(input)

        assert.deepStrictEqual(result, [1, 1, 2, 3])
      })
    })

    // array-flatten v2 unit tests.
    // https://github.com/blakeembrey/array-flatten/blob/v2.1.2/test.js
    describe('v2 API', () => {
      describe('flatten', () => {
        it('should flatten an array', () => {
          const result = flattenLegacy([
            1,
            [2, [3, [4, [5]]], 6, [[7], 8], 9],
            10
          ])

          assert.deepStrictEqual(result, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
        })

        it('should throw on non-array', () => {
          assert.throws(() => {
            flattenLegacy('test')
          }, TypeError)
        })

        it('should work with non-array', () => {
          const result = flattenLegacy.from('test')

          assert.deepStrictEqual(result, ['t', 'e', 's', 't'])
        })
      })

      describe('depth', () => {
        it('should flatten an array to a specific depth', () => {
          const result = flattenLegacy.depth([1, [2, [3], 4], 5], 1)

          assert.deepStrictEqual(result, [1, 2, [3], 4, 5])
        })

        it('should clone an array when no depth is specified', () => {
          const array = [1, [2, 3]]
          const clone = flattenLegacy.depth(array, 0)

          assert.ok(clone !== array)
          assert.deepStrictEqual(clone, array)
        })

        it('should throw on non-array', () => {
          assert.throws(() => {
            flattenLegacy.depth('test', 10)
          }, TypeError)
        })

        it('should throw on non-numeric depth', () => {
          assert.throws(() => {
            flattenLegacy.fromDepth('test', 'test')
          }, TypeError)
        })

        it('should work with "from"', () => {
          const result = flattenLegacy.fromDepth('test', 1)

          assert.deepStrictEqual(result, ['t', 'e', 's', 't'])
        })
      })
    })

    // array-flatten v1 unit tests.
    // https://github.com/blakeembrey/array-flatten/blob/v1.1.1/test.js
    describe('v1 API', () => {
      it('should flatten an array', () => {
        const res = flattenLegacy([1, [2, [3, [4, [5]]], 6, [[7], 8], 9], 10])

        assert.deepStrictEqual(res, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
      })

      it('should flatten an array to a specific depth', () => {
        const res = flattenLegacy([1, [2, [3], 4], 5], 1)

        assert.deepStrictEqual(res, [1, 2, [3], 4, 5])
      })

      it('should clone an array when no depth is specified', () => {
        const array = [1, [2, 3]]
        const clone = flattenLegacy(array, 0)

        assert.ok(clone !== array)
        assert.deepStrictEqual(clone, array)
      })
    })
  }
)
