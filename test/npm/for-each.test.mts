/**
 * @fileoverview Tests for for-each NPM package override.
 * Ported 1:1 from upstream v0.3.5 (45229651ed893773058ba9ccc42af8999014409f):
 * https://github.com/Raynos/for-each/blob/45229651ed893773058ba9ccc42af8999014409f/test/test.js
 */

import { describe, expect, it } from 'vitest'

import { setupNpmPackageTest } from '../util/npm-package-helper.mts'

const {
  eco,
  module: forEach,
  skip,
  sockRegPkgName,
} = await setupNpmPackageTest(import.meta.url)

describe(`${eco} > ${sockRegPkgName}`, { skip }, () => {
  it('calls each iterator on an object', () => {
    const results: Array<[unknown, unknown]> = []
    forEach({ a: 1, b: 2 }, (value: unknown, key: unknown) => {
      results.push([key, value])
    })
    expect(results).toEqual([
      ['a', 1],
      ['b', 2],
    ])
  })

  it('calls iterator with correct this value', () => {
    const thisValue = {}
    let context: unknown
    forEach(
      [0],
      function (this: unknown) {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        context = this
      },
      thisValue,
    )
    expect(context).toBe(thisValue)
  })

  describe('second argument: iterator', () => {
    it('throws for non-function iterators', () => {
      const arr: unknown[] = []
      expect(() => forEach(arr, undefined as any)).toThrow(TypeError)
      expect(() => forEach(arr, undefined as any)).toThrow(TypeError)
      expect(() => forEach(arr, '' as any)).toThrow(TypeError)
      expect(() => forEach(arr, /a/ as any)).toThrow(TypeError)
      expect(() => forEach(arr, true as any)).toThrow(TypeError)
      expect(() => forEach(arr, false as any)).toThrow(TypeError)
      expect(() => forEach(arr, NaN as any)).toThrow(TypeError)
      expect(() => forEach(arr, 42 as any)).toThrow(TypeError)
    })

    it('does not throw for function iterators', () => {
      const arr: unknown[] = []
      expect(() => forEach(arr, () => {})).not.toThrow()
    })
  })

  describe('array', () => {
    const arr = [1, 2, 3] as const

    it('iterates over every item', () => {
      let index = 0
      forEach(arr, () => {
        index += 1
      })
      expect(index).toBe(arr.length)
    })

    it('first iterator argument is the item', () => {
      const items: unknown[] = []
      forEach(arr, (item: unknown) => {
        items.push(item)
      })
      expect(items).toEqual([1, 2, 3])
    })

    it('second iterator argument is the index', () => {
      const indices: unknown[] = []
      forEach(arr, (_item: unknown, index: unknown) => {
        indices.push(index)
      })
      expect(indices).toEqual([0, 1, 2])
    })

    it('third iterator argument is the array', () => {
      forEach(arr, (_item: unknown, _index: unknown, array: unknown) => {
        expect(array).toEqual(arr)
      })
    })

    it('context argument', () => {
      const context = {}
      forEach(
        [] as unknown[],
        function (this: unknown) {
          expect(this).toBe(context)
        },
        context,
      )
    })
  })

  describe('object', () => {
    const obj = { a: 1, b: 2, c: 3 }
    const keys = ['a', 'b', 'c'] as const

    it('iterates over every object literal key', () => {
      let counter = 0
      forEach(obj, () => {
        counter += 1
      })
      expect(counter).toBe(keys.length)
    })

    it('iterates only over own keys', () => {
      function F(this: any) {
        this.a = 1
        this.b = 2
      }
      F.prototype.c = 3
      let counter = 0
      forEach(new (F as any)(), () => {
        counter += 1
      })
      expect(counter).toBe(2)
    })

    it('first iterator argument is the value', () => {
      const values: unknown[] = []
      forEach(obj, (item: unknown) => {
        values.push(item)
      })
      expect(values).toEqual([1, 2, 3])
    })

    it('second iterator argument is the key', () => {
      const foundKeys: unknown[] = []
      forEach(obj, (_item: unknown, key: unknown) => {
        foundKeys.push(key)
      })
      expect(foundKeys).toEqual(['a', 'b', 'c'])
    })

    it('third iterator argument is the object', () => {
      forEach(obj, (_item: unknown, _key: unknown, object: unknown) => {
        expect(object).toEqual(obj)
      })
    })

    it('context argument', () => {
      const context = {}
      forEach(
        {},
        function (this: unknown) {
          expect(this).toBe(context)
        },
        context,
      )
    })
  })

  describe('string', () => {
    const str = 'str' as const

    it('iterates over chars with correct index and value', () => {
      const results: Array<[unknown, unknown]> = []
      forEach(str, (item: unknown, index: unknown) => {
        results.push([index, item])
      })
      expect(results).toEqual([
        [0, 's'],
        [1, 't'],
        [2, 'r'],
      ])
    })
  })
})
