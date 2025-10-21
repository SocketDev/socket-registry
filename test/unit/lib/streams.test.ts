/**
 * @fileoverview Tests for stream utilities.
 *
 * Validates parallel iteration and transformation of async iterables.
 */

import {
  parallelEach,
  parallelMap,
  transform,
} from '@socketsecurity/lib/streams'
import { describe, expect, it } from 'vitest'

describe('streams utilities', () => {
  describe('parallelEach', () => {
    it('should iterate over array', async () => {
      const items = [1, 2, 3]
      const results: number[] = []

      await parallelEach(items, async item => {
        results.push(item)
      })

      expect(results.length).toBe(3)
      expect(results).toContain(1)
      expect(results).toContain(2)
      expect(results).toContain(3)
    })

    it('should handle empty iterable', async () => {
      const results: number[] = []
      await parallelEach([], async item => {
        results.push(item)
      })
      expect(results).toEqual([])
    })

    it('should support concurrency option', async () => {
      const items = [1, 2, 3, 4]
      const results: number[] = []

      await parallelEach(
        items,
        async item => {
          results.push(item)
        },
        { concurrency: 2 },
      )

      expect(results.length).toBe(4)
    })

    it('should work with async iterables', async () => {
      // eslint-disable-next-line unicorn/consistent-function-scoping
      async function* generate() {
        yield 1
        yield 2
        yield 3
      }

      const results: number[] = []
      await parallelEach(generate(), async item => {
        results.push(item)
      })

      expect(results).toEqual([1, 2, 3])
    })

    it('should handle async operations', async () => {
      const items = [1, 2, 3]
      const results: number[] = []

      await parallelEach(items, async item => {
        await new Promise(resolve => setTimeout(resolve, 10))
        results.push(item * 2)
      })

      expect(results.length).toBe(3)
    })
  })

  describe('parallelMap', () => {
    it('should map over array', async () => {
      const items = [1, 2, 3]
      const result = parallelMap(items, async item => item * 2)

      const mapped = []
      for await (const value of result) {
        mapped.push(value)
      }

      expect(mapped).toEqual([2, 4, 6])
    })

    it('should handle empty iterable', async () => {
      const result = parallelMap([], async item => item)
      const mapped: unknown[] = []
      for await (const value of result) {
        mapped.push(value)
      }
      expect(mapped).toEqual([])
    })

    it('should support concurrency option', async () => {
      const items = [1, 2, 3, 4]
      const result = parallelMap(items, async item => item * 2, {
        concurrency: 2,
      })

      const mapped = []
      for await (const value of result) {
        mapped.push(value)
      }

      expect(mapped.length).toBe(4)
    })

    it('should work with async iterables', async () => {
      // eslint-disable-next-line unicorn/consistent-function-scoping
      async function* generate() {
        yield 1
        yield 2
        yield 3
      }

      const result = parallelMap(generate(), async item => item * 2)
      const mapped = []
      for await (const value of result) {
        mapped.push(value)
      }

      expect(mapped).toEqual([2, 4, 6])
    })

    it('should handle async operations', async () => {
      const items = [1, 2, 3]
      const result = parallelMap(items, async item => {
        await new Promise(resolve => setTimeout(resolve, 10))
        return item * 3
      })

      const mapped = []
      for await (const value of result) {
        mapped.push(value)
      }

      expect(mapped).toEqual([3, 6, 9])
    })

    it('should support string transformation', async () => {
      const items = ['a', 'b', 'c']
      const result = parallelMap(items, async item => item.toUpperCase())

      const mapped = []
      for await (const value of result) {
        mapped.push(value)
      }

      expect(mapped).toEqual(['A', 'B', 'C'])
    })

    it('should support object transformation', async () => {
      const items = [{ id: 1 }, { id: 2 }]
      const result = parallelMap(items, async item => ({
        ...item,
        doubled: item.id * 2,
      }))

      const mapped = []
      for await (const value of result) {
        mapped.push(value)
      }

      expect(mapped[0]).toEqual({ id: 1, doubled: 2 })
      expect(mapped[1]).toEqual({ id: 2, doubled: 4 })
    })
  })

  describe('transform', () => {
    it('should transform array', async () => {
      const items = [1, 2, 3]
      const result = transform(items, async item => item * 2)

      const transformed = []
      for await (const value of result) {
        transformed.push(value)
      }

      expect(transformed).toEqual([2, 4, 6])
    })

    it('should handle empty iterable', async () => {
      const result = transform([], async item => item)
      const transformed: unknown[] = []
      for await (const value of result) {
        transformed.push(value)
      }
      expect(transformed).toEqual([])
    })

    it('should support concurrency option', async () => {
      const items = [1, 2, 3, 4]
      const result = transform(items, async item => item * 2, {
        concurrency: 2,
      })

      const transformed = []
      for await (const value of result) {
        transformed.push(value)
      }

      expect(transformed.length).toBe(4)
    })

    it('should work with async iterables', async () => {
      // eslint-disable-next-line unicorn/consistent-function-scoping
      async function* generate() {
        yield 1
        yield 2
        yield 3
      }

      const result = transform(generate(), async item => item * 2)
      const transformed = []
      for await (const value of result) {
        transformed.push(value)
      }

      expect(transformed).toEqual([2, 4, 6])
    })

    it('should handle async operations', async () => {
      const items = [1, 2, 3]
      const result = transform(items, async item => {
        await new Promise(resolve => setTimeout(resolve, 10))
        return item + 10
      })

      const transformed = []
      for await (const value of result) {
        transformed.push(value)
      }

      expect(transformed).toEqual([11, 12, 13])
    })

    it('should support complex transformations', async () => {
      const items = ['hello', 'world']
      const result = transform(items, async item => ({
        original: item,
        upper: item.toUpperCase(),
        length: item.length,
      }))

      const transformed = []
      for await (const value of result) {
        transformed.push(value)
      }

      expect(transformed[0]).toEqual({
        original: 'hello',
        upper: 'HELLO',
        length: 5,
      })
    })
  })

  describe('edge cases', () => {
    it('should handle single item in parallelEach', async () => {
      const results: number[] = []
      await parallelEach([42], async item => {
        results.push(item)
      })
      expect(results).toEqual([42])
    })

    it('should handle single item in parallelMap', async () => {
      const result = parallelMap([42], async item => item * 2)
      const mapped = []
      for await (const value of result) {
        mapped.push(value)
      }
      expect(mapped).toEqual([84])
    })

    it('should handle single item in transform', async () => {
      const result = transform([42], async item => item * 2)
      const transformed = []
      for await (const value of result) {
        transformed.push(value)
      }
      expect(transformed).toEqual([84])
    })

    it('should handle high concurrency', async () => {
      const items = Array.from({ length: 50 }, (_, i) => i)
      const result = parallelMap(items, async item => item, { concurrency: 10 })

      const mapped = []
      for await (const value of result) {
        mapped.push(value)
      }

      expect(mapped.length).toBe(50)
    })
  })
})
