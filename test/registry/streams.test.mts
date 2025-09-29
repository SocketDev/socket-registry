import { describe, expect, it } from 'vitest'

const {
  parallelEach,
  parallelMap,
  transform,
} = require('../../registry/dist/lib/streams')

// Helper generators moved to outer scope.
async function* makeStringIterable(items: string[]) {
  for (const item of items) {
    yield item
  }
}

async function* makeNumberIterable(start: number, end: number) {
  for (let i = start; i <= end; i++) {
    yield i
  }
}

async function* makeErrorIterable() {
  yield 'ok'
  yield 'error'
  yield 'never'
}

async function* makeFixedStringIterable() {
  yield 'HELLO'
  yield 'WORLD'
}

// Helper transform functions moved to outer scope.
const upperCaseTransform = (item: string) => item.toUpperCase()
const lowerCaseTransformAsync = async (item: string) => {
  await new Promise(r => setTimeout(r, 10))
  return item.toLowerCase()
}
const errorTransform = (item: string) => {
  if (item === 'error') {
    throw new Error('Transform error')
  }
  return item
}
const doubleMapperAsync = async (item: number) => {
  await new Promise(r => setTimeout(r, 10))
  return item * 2
}
const incrementMapper = (item: number) => item + 1
const errorMapperAt3 = async (item: number) => {
  if (item === 3) {
    throw new Error('Map error')
  }
  return item
}
const errorProcessorAt2 = async (item: number) => {
  if (item === 2) {
    throw new Error('Process error')
  }
}

describe('streams module', () => {
  describe('transform', () => {
    it('should transform async iterable items', async () => {
      const input = ['hello', 'world']

      const result = transform(makeStringIterable(input), upperCaseTransform)
      const output: string[] = []

      for await (const item of result) {
        output.push(item)
      }

      expect(output).toEqual(['HELLO', 'WORLD'])
    })

    it('should handle async transform functions', async () => {
      const result = transform(
        makeFixedStringIterable(),
        lowerCaseTransformAsync,
      )
      const output: string[] = []

      for await (const item of result) {
        output.push(item)
      }

      expect(output).toEqual(['hello', 'world'])
    })

    it('should handle errors in transform', async () => {
      const result = transform(makeErrorIterable(), errorTransform)

      await expect(async () => {
        const output = []
        for await (const item of result) {
          output.push(item)
        }
      }).rejects.toThrow('Transform error')
    })

    it('should handle concurrency options', async () => {
      let concurrent = 0
      let maxConcurrent = 0

      const transformFn = async (item: number) => {
        concurrent++
        maxConcurrent = Math.max(maxConcurrent, concurrent)
        await new Promise(r => setTimeout(r, 20))
        concurrent--
        return item * 2
      }

      const result = transform(makeNumberIterable(1, 5), transformFn, {
        concurrency: 2,
      })
      const output: number[] = []

      for await (const item of result) {
        output.push(item)
      }

      expect(maxConcurrent).toBeLessThanOrEqual(2)
      expect(output.sort((a, b) => a - b)).toEqual([2, 4, 6, 8, 10])
    })
  })

  describe('parallelMap', () => {
    it('should map async iterable items in parallel', async () => {
      const result = parallelMap(makeNumberIterable(1, 5), doubleMapperAsync, {
        concurrency: 2,
      })
      const output: number[] = []

      for await (const item of result) {
        output.push(item)
      }

      expect(output.sort((a, b) => a - b)).toEqual([2, 4, 6, 8, 10])
    })

    it('should maintain concurrency limit', async () => {
      let concurrent = 0
      let maxConcurrent = 0

      const mapper = async (item: number) => {
        concurrent++
        maxConcurrent = Math.max(maxConcurrent, concurrent)
        await new Promise(r => setTimeout(r, 20))
        concurrent--
        return item
      }

      makeNumberIterable(1, 5)

      const result = parallelMap(makeNumberIterable(1, 5), mapper, {
        concurrency: 2,
      })

      for await (const _ of result) {
        // consume items
      }

      expect(maxConcurrent).toBeLessThanOrEqual(2)
    })

    it('should handle errors in mapper', async () => {
      const result = parallelMap(makeNumberIterable(1, 4), errorMapperAt3)

      await expect(async () => {
        const output = []
        for await (const item of result) {
          output.push(item)
        }
      }).rejects.toThrow('Map error')
    })

    it('should work with sync mappers', async () => {
      const result = parallelMap(makeNumberIterable(1, 5), incrementMapper)
      const output: number[] = []

      for await (const item of result) {
        output.push(item)
      }

      expect(output).toEqual([2, 3, 4, 5, 6])
    })
  })

  describe('parallelEach', () => {
    it('should process async iterable items in parallel', async () => {
      const results: number[] = []
      const processor = async (item: number) => {
        await new Promise(r => setTimeout(r, 10))
        results.push(item * 2)
      }

      makeNumberIterable(1, 5)

      await parallelEach(makeNumberIterable(1, 5), processor, {
        concurrency: 2,
      })

      expect(results.sort((a, b) => a - b)).toEqual([2, 4, 6, 8, 10])
    })

    it('should process each item', async () => {
      const processed: number[] = []
      const processor = async (item: number) => {
        processed.push(item)
      }

      await parallelEach(makeNumberIterable(1, 5), processor)

      expect(processed).toEqual([1, 2, 3, 4, 5])
    })

    it('should maintain concurrency limit', async () => {
      let concurrent = 0
      let maxConcurrent = 0

      const processor = async (_item: number) => {
        concurrent++
        maxConcurrent = Math.max(maxConcurrent, concurrent)
        await new Promise(r => setTimeout(r, 20))
        concurrent--
      }

      await parallelEach(makeNumberIterable(1, 5), processor, {
        concurrency: 3,
      })

      expect(maxConcurrent).toBeLessThanOrEqual(3)
    })

    it('should handle errors in processor', async () => {
      await expect(
        parallelEach(makeNumberIterable(1, 3), errorProcessorAt2),
      ).rejects.toThrow('Process error')
    })

    it('should work with sync processors', async () => {
      const processed: number[] = []
      const processor = (item: number) => {
        processed.push(item)
      }

      await parallelEach(makeNumberIterable(1, 5), processor)

      expect(processed).toEqual([1, 2, 3, 4, 5])
    })
  })
})
