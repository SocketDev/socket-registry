import { describe, expect, it, vi } from 'vitest'

const {
  normalizeIterationOptions,
  normalizeRetryOptions,
  pEach,
  pEachChunk,
  pFilter,
  pFilterChunk,
  pRetry,
  resolveRetryOptions,
} = require('../../registry/dist/lib/promises')

describe('promises module', () => {
  describe('pEach', () => {
    it('should iterate over array', async () => {
      const results: number[] = []
      await pEach([1, 2, 3], async (x: number) => {
        await new Promise(r => setTimeout(r, 10))
        results.push(x * 2)
      })
      expect(results.sort()).toEqual([2, 4, 6])
    })

    it('should handle concurrency limit', async () => {
      let concurrent = 0
      let maxConcurrent = 0
      await pEach(
        [1, 2, 3, 4, 5],
        async (_x: number) => {
          concurrent++
          maxConcurrent = Math.max(maxConcurrent, concurrent)
          await new Promise(r => setTimeout(r, 20))
          concurrent--
        },
        { concurrency: 2 },
      )
      expect(maxConcurrent).toBeLessThanOrEqual(2)
    })

    it('should handle empty arrays', async () => {
      const fn = vi.fn()
      await pEach([], fn)
      expect(fn).not.toHaveBeenCalled()
    })

    it('should preserve order with concurrency', async () => {
      const results: number[] = []
      await pEach(
        [3, 1, 2],
        async (x: number) => {
          await new Promise(r => setTimeout(r, x * 10))
          results.push(x)
        },
        { concurrency: 1 },
      )
      expect(results).toEqual([3, 1, 2])
    })
  })

  describe('pEachChunk', () => {
    it('should process array in chunks', async () => {
      const chunks: number[][] = []
      await pEachChunk(
        [1, 2, 3, 4, 5],
        async (chunk: number[]) => {
          chunks.push(chunk)
        },
        { chunkSize: 2 },
      )
      expect(chunks).toEqual([[1, 2], [3, 4], [5]])
    })

    it('should handle chunk size larger than array', async () => {
      const chunks: number[][] = []
      await pEachChunk(
        [1, 2, 3],
        async (chunk: number[]) => {
          chunks.push(chunk)
        },
        { chunkSize: 5 },
      )
      expect(chunks).toEqual([[1, 2, 3]])
    })

    it('should handle empty arrays', async () => {
      const fn = vi.fn()
      await pEachChunk([], fn, { chunkSize: 2 })
      expect(fn).not.toHaveBeenCalled()
    })

    it('should handle concurrency with chunks', async () => {
      let concurrent = 0
      let maxConcurrent = 0
      await pEachChunk(
        [1, 2, 3, 4, 5, 6],
        async (_chunk: number[]) => {
          concurrent++
          maxConcurrent = Math.max(maxConcurrent, concurrent)
          await new Promise(r => setTimeout(r, 20))
          concurrent--
        },
        { chunkSize: 2, concurrency: 2 },
      )
      expect(maxConcurrent).toBeLessThanOrEqual(2)
    })
  })

  describe('pFilter', () => {
    it('should filter array with async predicate', async () => {
      const result = await pFilter([1, 2, 3, 4, 5], async (x: number) => {
        await new Promise(r => setTimeout(r, 10))
        return x % 2 === 0
      })
      expect(result).toEqual([2, 4])
    })

    it('should handle concurrency limit', async () => {
      let concurrent = 0
      let maxConcurrent = 0
      const result = await pFilter(
        [1, 2, 3, 4, 5],
        async (x: number) => {
          concurrent++
          maxConcurrent = Math.max(maxConcurrent, concurrent)
          await new Promise(r => setTimeout(r, 20))
          concurrent--
          return x > 2
        },
        { concurrency: 2 },
      )
      expect(result).toEqual([3, 4, 5])
      expect(maxConcurrent).toBeLessThanOrEqual(2)
    })

    it('should handle empty arrays', async () => {
      const result = await pFilter([], async (_x: any) => true)
      expect(result).toEqual([])
    })

    it('should preserve order', async () => {
      const result = await pFilter([3, 1, 4, 2, 5], async (x: number) => {
        await new Promise(r => setTimeout(r, x * 10))
        return x > 2
      })
      expect(result).toEqual([3, 4, 5])
    })
  })

  describe('pFilterChunk', () => {
    it('should filter chunks of arrays', async () => {
      const chunks = [
        [1, 2, 3],
        [4, 5, 6],
      ]
      const result = await pFilterChunk(chunks, async (value: number) => {
        await new Promise(r => setTimeout(r, 10))
        return value % 2 === 0
      })
      expect(result).toEqual([[2], [4, 6]])
    })

    it('should handle empty chunks', async () => {
      const result = await pFilterChunk([], async (_value: any) => true)
      expect(result).toEqual([])
    })

    it('should filter out all values when predicate is false', async () => {
      const chunks = [[1, 2, 3]]
      const result = await pFilterChunk(
        chunks,
        async (value: number) => value > 10,
      )
      expect(result).toEqual([[]])
    })
  })

  describe('pRetry', () => {
    it('should retry failed operations', async () => {
      let attempts = 0
      const result = await pRetry(
        async () => {
          attempts++
          if (attempts < 3) {
            throw new Error('not yet')
          }
          return 'success'
        },
        { retries: 5, minTimeout: 10 },
      )
      expect(result).toBe('success')
      expect(attempts).toBe(3)
    })

    it('should throw after max retries', async () => {
      let attempts = 0
      await expect(
        pRetry(
          async () => {
            attempts++
            throw new Error('always fails')
          },
          { retries: 2, minTimeout: 10 },
        ),
      ).rejects.toThrow('always fails')
      expect(attempts).toBe(3)
    })

    it('should work on first try', async () => {
      let attempts = 0
      const result = await pRetry(
        async () => {
          attempts++
          return 'immediate success'
        },
        { retries: 3, minTimeout: 10 },
      )
      expect(result).toBe('immediate success')
      expect(attempts).toBe(1)
    })

    it('should handle sync functions', async () => {
      const result = await pRetry(() => 'sync result', { retries: 1 })
      expect(result).toBe('sync result')
    })
  })

  describe('normalizeIterationOptions', () => {
    it('should normalize options with defaults', () => {
      const options = normalizeIterationOptions()
      expect(options).toHaveProperty('concurrency')
      expect(options.concurrency).toBeGreaterThan(0)
    })

    it('should accept custom concurrency', () => {
      const options = normalizeIterationOptions({ concurrency: 5 })
      expect(options.concurrency).toBe(5)
    })

    it('should handle number as concurrency', () => {
      const options = normalizeIterationOptions(3)
      expect(options.concurrency).toBe(3)
    })

    it('should handle invalid options', () => {
      const options = normalizeIterationOptions({ concurrency: -1 })
      expect(options.concurrency).toBeGreaterThan(0)
    })
  })

  describe('normalizeRetryOptions', () => {
    it('should normalize retry options', () => {
      const options = normalizeRetryOptions({ retries: 3 })
      expect(options).toHaveProperty('retries')
      expect(options.retries).toBe(3)
    })

    it('should provide default values', () => {
      const options = normalizeRetryOptions()
      expect(options).toHaveProperty('retries')
      expect(options).toHaveProperty('minTimeout')
    })

    it('should handle custom timeout values', () => {
      const options = normalizeRetryOptions({
        retries: 2,
        minTimeout: 100,
        maxTimeout: 1000,
      })
      expect(options.minTimeout).toBe(100)
      expect(options.maxTimeout).toBe(1000)
    })
  })

  describe('resolveRetryOptions', () => {
    it('should resolve retry options', () => {
      const options = resolveRetryOptions({ retries: 5 })
      expect(options).toBeDefined()
      expect(options.retries).toBe(5)
    })

    it('should handle undefined options', () => {
      const options = resolveRetryOptions()
      expect(options).toBeDefined()
    })

    it('should merge with defaults', () => {
      const options = resolveRetryOptions({ factor: 2 })
      expect(options).toHaveProperty('retries')
      expect(options.factor).toBe(2)
    })
  })

  describe('pEach edge cases', () => {
    it('should handle async errors', async () => {
      const error = new Error('test error')
      await expect(
        pEach([1, 2, 3], async () => {
          throw error
        }),
      ).rejects.toThrow('test error')
    })

    it('should handle sync errors', async () => {
      const error = new Error('sync error')
      await expect(
        pEach([1, 2, 3], () => {
          throw error
        }),
      ).rejects.toThrow('sync error')
    })

    it('should handle mixed success and failure', async () => {
      const results: number[] = []
      await expect(
        pEach([1, 2, 3], async (x: number) => {
          if (x === 2) {
            throw new Error('fail on 2')
          }
          results.push(x)
        }),
      ).rejects.toThrow('fail on 2')
    })

    it('should handle large arrays efficiently', async () => {
      const largeArray = Array.from({ length: 100 }, (_, i) => i)
      const results: number[] = []
      await pEach(
        largeArray,
        async (x: number) => {
          results.push(x * 2)
        },
        { concurrency: 10 },
      )
      expect(results).toHaveLength(100)
    })
  })

  describe('pRetry edge cases', () => {
    it('should handle timeout options', async () => {
      let attempts = 0
      await expect(
        pRetry(
          async () => {
            attempts++
            throw new Error('timeout test')
          },
          { retries: 2, minTimeout: 1, maxTimeout: 5 },
        ),
      ).rejects.toThrow('timeout test')
      // initial + 2 retries
      expect(attempts).toBe(3)
    })

    it('should handle backoff factor', async () => {
      let attempts = 0
      await expect(
        pRetry(
          async () => {
            attempts++
            throw new Error('backoff test')
          },
          { retries: 2, minTimeout: 1, factor: 1.5 },
        ),
      ).rejects.toThrow('backoff test')
      expect(attempts).toBe(3)
    })

    it('should handle randomize option', async () => {
      let attempts = 0
      await expect(
        pRetry(
          async () => {
            attempts++
            throw new Error('randomize test')
          },
          { retries: 1, randomize: true, minTimeout: 1 },
        ),
      ).rejects.toThrow('randomize test')
      expect(attempts).toBe(2)
    })
  })

  describe('pFilter edge cases', () => {
    it('should handle predicate errors', async () => {
      await expect(
        pFilter([1, 2, 3], async (x: number) => {
          if (x === 2) {
            throw new Error('predicate error')
          }
          return x > 1
        }),
      ).rejects.toThrow('predicate error')
    })

    it('should handle mixed results', async () => {
      const result = await pFilter([1, 2, 3, 4, 5], async (x: number) => {
        await new Promise(r => setTimeout(r, Math.random() * 10))
        return x % 2 === 0
      })
      expect(result).toEqual([2, 4])
    })
  })

  describe('additional coverage', () => {
    it('should test normalization with edge cases', () => {
      const options = normalizeIterationOptions()
      expect(options).toBeDefined()
      expect(options.concurrency).toBeGreaterThan(0)
    })

    it('should test retry options normalization', () => {
      const options = normalizeRetryOptions()
      expect(options).toBeDefined()
      expect(options.retries).toBeGreaterThanOrEqual(0)
    })
  })
})
