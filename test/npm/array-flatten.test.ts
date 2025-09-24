import path from 'node:path'

import { describe, expect, it } from 'vitest'

import constants from '../../scripts/constants'
import { isPackageTestingSkipped } from '../../scripts/lib/tests'

const { NPM, testNpmNodeWorkspacesPath } = constants

const eco = NPM
const sockRegPkgName = path.basename(__filename, '.test.ts')
const pkgPath = path.join(testNpmNodeWorkspacesPath, sockRegPkgName)

describe(
  `${eco} > ${sockRegPkgName}`,
  { skip: isPackageTestingSkipped(eco, sockRegPkgName) },
  () => {
    const flattenLegacy = require(path.join(pkgPath, 'index.js'))
    const { flatten } = flattenLegacy

    // array-flatten v3 unit tests.
    // https://github.com/blakeembrey/array-flatten/blob/v3.0.0/src/index.spec.ts
    describe('v3 API', () => {
      it('should flatten an array', () => {
        const result = flatten([1, [2, [3, [4, [5]]], 6, [[7], 8], 9], 10])

        expect(result).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
      })

      it('should work with array-like', () => {
        const result = flatten('test')

        expect(result).toEqual(['t', 'e', 's', 't'])
      })

      it('should work with readonly array', () => {
        const input = [1, [2, [3, [4]]]] as const
        const result = flatten(input)

        expect(result).toEqual([1, 2, 3, 4])
      })

      it('should work with arguments', () => {
        const input = (function () {
          return arguments
        })()
        const result = flatten(input)

        expect(result).toEqual([])
      })

      it('should work with mixed types', () => {
        // eslint-disable-next-line unicorn/consistent-function-scoping
        const fn = (x: string) => x
        const input = [1, ['test', [fn, [true]]]]
        const result = flatten(input)

        expect(result).toEqual([1, 'test', fn, true])
      })

      it('should work with tuples', () => {
        const input: [number, [number, number], [number]] = [1, [1, 2], [3]]
        const result = flatten(input)

        expect(result).toEqual([1, 1, 2, 3])
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
            10,
          ])

          expect(result).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
        })

        it('should throw on non-array', () => {
          expect(() => {
            flattenLegacy('test')
          }).toThrow(TypeError)
        })

        it('should work with non-array', () => {
          const result = flattenLegacy.from('test')

          expect(result).toEqual(['t', 'e', 's', 't'])
        })
      })

      describe('depth', () => {
        it('should flatten an array to a specific depth', () => {
          const result = flattenLegacy.depth([1, [2, [3], 4], 5], 1)

          expect(result).toEqual([1, 2, [3], 4, 5])
        })

        it('should clone an array when no depth is specified', () => {
          const array = [1, [2, 3]]
          const clone = flattenLegacy.depth(array, 0)

          expect(clone !== array).toBe(true)
          expect(clone).toEqual(array)
        })

        it('should throw on non-array', () => {
          expect(() => {
            flattenLegacy.depth('test', 10)
          }).toThrow(TypeError)
        })

        it('should throw on non-numeric depth', () => {
          expect(() => {
            flattenLegacy.fromDepth('test', 'test')
          }).toThrow(TypeError)
        })

        it('should work with "from"', () => {
          const result = flattenLegacy.fromDepth('test', 1)

          expect(result).toEqual(['t', 'e', 's', 't'])
        })
      })
    })

    // array-flatten v1 unit tests.
    // https://github.com/blakeembrey/array-flatten/blob/v1.1.1/test.js
    describe('v1 API', () => {
      it('should flatten an array', () => {
        const res = flattenLegacy([1, [2, [3, [4, [5]]], 6, [[7], 8], 9], 10])

        expect(res).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
      })

      it('should flatten an array to a specific depth', () => {
        const res = flattenLegacy([1, [2, [3], 4], 5], 1)

        expect(res).toEqual([1, 2, [3], 4, 5])
      })

      it('should clone an array when no depth is specified', () => {
        const array = [1, [2, 3]]
        const clone = flattenLegacy(array, 0)

        expect(clone !== array).toBe(true)
        expect(clone).toEqual(array)
      })
    })
  },
)
