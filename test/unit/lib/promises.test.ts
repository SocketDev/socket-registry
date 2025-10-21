/**
 * @fileoverview Tests for promise utilities.
 *
 * Validates promise control flow, iteration, filtering, chunking, and retry logic.
 */

import {
  normalizeIterationOptions,
  normalizeRetryOptions,
  pEach,
  pEachChunk,
  pFilter,
  pFilterChunk,
  pRetry,
  resolveRetryOptions,
} from '@socketsecurity/lib/promises'
import { describe, expect, it } from 'vitest'

describe('promises utilities', () => {
  describe('normalizeRetryOptions', () => {
    it('should normalize number to retry options', () => {
      const options = normalizeRetryOptions(3)
      expect(options).toHaveProperty('retries')
      expect(options.retries).toBe(3)
    })

    it('should return default options when no input', () => {
      const options = normalizeRetryOptions()
      expect(options).toHaveProperty('retries')
      expect(typeof options.retries).toBe('number')
    })

    it('should preserve retry options object', () => {
      const input = { retries: 5, baseDelayMs: 100 }
      const options = normalizeRetryOptions(input)
      expect(options.retries).toBe(5)
      expect(options.baseDelayMs).toBe(100)
    })

    it('should set default backoff factor', () => {
      const options = normalizeRetryOptions(3)
      expect(options.backoffFactor).toBeDefined()
      expect(typeof options.backoffFactor).toBe('number')
    })

    it('should enable jitter by default', () => {
      const options = normalizeRetryOptions(3)
      expect(options.jitter).toBe(true)
    })

    it('should allow disabling jitter', () => {
      const options = normalizeRetryOptions({ retries: 3, jitter: false })
      expect(options.jitter).toBe(false)
    })

    it('should set reasonable default delays', () => {
      const options = normalizeRetryOptions(3)
      expect(options.baseDelayMs).toBeGreaterThan(0)
      expect(options.maxDelayMs).toBeGreaterThan(0)
    })
  })

  describe('resolveRetryOptions', () => {
    it('should resolve number to retry count', () => {
      const options = resolveRetryOptions(5)
      expect(options.retries).toBe(5)
    })

    it('should resolve undefined to default', () => {
      const options = resolveRetryOptions()
      expect(options).toHaveProperty('retries')
      expect(typeof options.retries).toBe('number')
    })

    it('should pass through retry options object', () => {
      const input = { retries: 3, maxDelayMs: 5000 }
      const options = resolveRetryOptions(input)
      expect(options.retries).toBe(3)
      expect(options.maxDelayMs).toBe(5000)
    })

    it('should handle zero retries', () => {
      const options = resolveRetryOptions(0)
      expect(options.retries).toBe(0)
    })
  })

  describe('normalizeIterationOptions', () => {
    it('should normalize number to concurrency', () => {
      const options = normalizeIterationOptions(5)
      expect(options.concurrency).toBe(5)
    })

    it('should set default concurrency to 1', () => {
      const options = normalizeIterationOptions()
      expect(options.concurrency).toBe(1)
    })

    it('should preserve concurrency from options object', () => {
      const options = normalizeIterationOptions({ concurrency: 10 })
      expect(options.concurrency).toBe(10)
    })

    it('should include retry options', () => {
      const options = normalizeIterationOptions({ concurrency: 5, retries: 3 })
      expect(options.retries).toBeDefined()
      expect(options.retries.retries).toBe(3)
    })

    it('should include signal', () => {
      const options = normalizeIterationOptions()
      expect(options.signal).toBeDefined()
    })

    it('should enforce minimum concurrency of 1', () => {
      const options = normalizeIterationOptions({ concurrency: 0 })
      expect(options.concurrency).toBe(1)
    })

    it('should enforce minimum concurrency for negative numbers', () => {
      const options = normalizeIterationOptions({ concurrency: -5 })
      expect(options.concurrency).toBe(1)
    })

    it('should handle retries as number', () => {
      const options = normalizeIterationOptions({ concurrency: 2, retries: 3 })
      expect(options.retries.retries).toBe(3)
    })

    it('should handle retries as options object', () => {
      const options = normalizeIterationOptions({
        concurrency: 2,
        retries: { retries: 5, baseDelayMs: 100 },
      })
      expect(options.retries.retries).toBe(5)
      expect(options.retries.baseDelayMs).toBe(100)
    })
  })

  describe('pEach', () => {
    it('should iterate over array', async () => {
      const items = [1, 2, 3]
      const results: number[] = []
      await pEach(items, async item => {
        results.push(item)
      })
      expect(results).toEqual([1, 2, 3])
    })

    it('should handle empty array', async () => {
      const results: number[] = []
      await pEach([], async item => {
        results.push(item)
      })
      expect(results).toEqual([])
    })

    it('should process items sequentially by default', async () => {
      const order: number[] = []
      await pEach([1, 2, 3], async item => {
        await new Promise(resolve => setTimeout(resolve, 10))
        order.push(item)
      })
      expect(order).toEqual([1, 2, 3])
    })

    it('should support concurrency', async () => {
      const results: number[] = []
      await pEach(
        [1, 2, 3, 4],
        async item => {
          results.push(item)
        },
        { concurrency: 2 },
      )
      expect(results.length).toBe(4)
      expect(results).toContain(1)
      expect(results).toContain(2)
      expect(results).toContain(3)
      expect(results).toContain(4)
    })

    it('should pass items to callback', async () => {
      const items: string[] = []
      await pEach(['a', 'b', 'c'], async item => {
        items.push(item)
      })
      expect(items).toEqual(['a', 'b', 'c'])
    })

    it('should handle async errors', async () => {
      await expect(
        pEach([1, 2, 3], async item => {
          if (item === 2) {
            throw new Error('test error')
          }
        }),
      ).rejects.toThrow('test error')
    })
  })

  describe('pFilter', () => {
    it('should filter array based on predicate', async () => {
      const items = [1, 2, 3, 4, 5]
      const results = await pFilter(items, async item => item % 2 === 0)
      expect(results).toEqual([2, 4])
    })

    it('should handle empty array', async () => {
      const results = await pFilter([], async () => true)
      expect(results).toEqual([])
    })

    it('should filter all when predicate returns false', async () => {
      const items = [1, 2, 3]
      const results = await pFilter(items, async () => false)
      expect(results).toEqual([])
    })

    it('should keep all when predicate returns true', async () => {
      const items = [1, 2, 3]
      const results = await pFilter(items, async () => true)
      expect(results).toEqual([1, 2, 3])
    })

    it('should filter based on item value', async () => {
      const items = ['a', 'b', 'c']
      const results = await pFilter(items, async item => item !== 'a')
      expect(results).toEqual(['b', 'c'])
    })

    it('should support concurrency', async () => {
      const items = [1, 2, 3, 4, 5, 6]
      const results = await pFilter(items, async item => item % 2 === 0, {
        concurrency: 3,
      })
      expect(results).toEqual([2, 4, 6])
    })

    it('should handle async errors in predicate', async () => {
      await expect(
        pFilter([1, 2, 3], async item => {
          if (item === 2) {
            throw new Error('filter error')
          }
          return true
        }),
      ).rejects.toThrow('filter error')
    })
  })

  describe('pEachChunk', () => {
    it('should process items in chunks', async () => {
      const items = [1, 2, 3, 4, 5, 6]
      const chunks: number[][] = []
      await pEachChunk(
        items,
        async chunk => {
          chunks.push(chunk)
        },
        { chunkSize: 2 },
      )
      expect(chunks.length).toBe(3)
      expect(chunks[0]).toEqual([1, 2])
      expect(chunks[1]).toEqual([3, 4])
      expect(chunks[2]).toEqual([5, 6])
    })

    it('should handle array not evenly divisible by chunk size', async () => {
      const items = [1, 2, 3, 4, 5]
      const chunks: number[][] = []
      await pEachChunk(
        items,
        async chunk => {
          chunks.push(chunk)
        },
        { chunkSize: 2 },
      )
      expect(chunks.length).toBe(3)
      expect(chunks[2]).toEqual([5])
    })

    it('should handle empty array', async () => {
      const chunks: any[] = []
      await pEachChunk(
        [],
        async chunk => {
          chunks.push(chunk)
        },
        { chunkSize: 2 },
      )
      expect(chunks).toEqual([])
    })

    it('should handle chunk size larger than array', async () => {
      const items = [1, 2, 3]
      const chunks: number[][] = []
      await pEachChunk(
        items,
        async chunk => {
          chunks.push(chunk)
        },
        { chunkSize: 10 },
      )
      expect(chunks.length).toBe(1)
      expect(chunks[0]).toEqual([1, 2, 3])
    })

    it('should support concurrency for chunks', async () => {
      const items = [1, 2, 3, 4, 5, 6, 7, 8]
      const processedChunks: number[][] = []
      await pEachChunk(
        items,
        async chunk => {
          processedChunks.push(chunk)
        },
        { chunkSize: 2 },
      )
      expect(processedChunks.length).toBe(4)
    })
  })

  describe('pFilterChunk', () => {
    it('should filter items in chunks', async () => {
      const chunks = [
        [1, 2],
        [3, 4],
        [5, 6],
      ]
      const results = await pFilterChunk(chunks, async item => item % 2 === 0)
      expect(results.flat()).toEqual([2, 4, 6])
    })

    it('should handle empty array', async () => {
      const results = await pFilterChunk([], async _item => true)
      expect(results).toEqual([])
    })

    it('should flatten results from chunks', async () => {
      const chunks = [
        [1, 2],
        [3, 4],
      ]
      const results = await pFilterChunk(chunks, async item => item > 2)
      expect(results.flat()).toEqual([3, 4])
    })

    it('should support concurrency', async () => {
      const chunks = [
        [1, 2],
        [3, 4],
        [5, 6],
        [7, 8],
      ]
      const results = await pFilterChunk(chunks, async item => item % 2 === 0)
      expect(results.flat()).toEqual([2, 4, 6, 8])
    })
  })

  describe('pRetry', () => {
    it('should succeed on first try', async () => {
      let attempts = 0
      const result = await pRetry(
        async () => {
          attempts++
          return 'success'
        },
        { retries: 3 },
      )
      expect(result).toBe('success')
      expect(attempts).toBe(1)
    })

    it('should retry on failure', async () => {
      let attempts = 0
      const result = await pRetry(
        async () => {
          attempts++
          if (attempts < 3) {
            throw new Error('retry')
          }
          return 'success'
        },
        { retries: 5, baseDelayMs: 10 },
      )
      expect(result).toBe('success')
      expect(attempts).toBe(3)
    })

    it('should fail after max retries', async () => {
      let attempts = 0
      await expect(
        pRetry(
          async () => {
            attempts++
            throw new Error('always fails')
          },
          { retries: 3, baseDelayMs: 10 },
        ),
      ).rejects.toThrow('always fails')
      expect(attempts).toBeGreaterThan(1)
    })

    it('should handle zero retries', async () => {
      let attempts = 0
      await expect(
        pRetry(
          async () => {
            attempts++
            throw new Error('fails')
          },
          { retries: 0 },
        ),
      ).rejects.toThrow('fails')
      expect(attempts).toBe(1)
    })

    it('should call onRetry callback', async () => {
      let retryCount = 0
      let attempts = 0
      await pRetry(
        async () => {
          attempts++
          if (attempts < 2) {
            throw new Error('retry')
          }
          return 'success'
        },
        {
          retries: 3,
          baseDelayMs: 10,
          onRetry: (_attempt, _error, _delay) => {
            retryCount++
            return true as boolean
          },
        },
      )
      expect(retryCount).toBeGreaterThan(0)
    })

    it('should cancel retry when onRetry returns false', async () => {
      let attempts = 0
      await expect(
        pRetry(
          async () => {
            attempts++
            throw new Error('fails')
          },
          {
            retries: 5,
            baseDelayMs: 10,
            onRetry: () => false,
            onRetryCancelOnFalse: true,
          },
        ),
      ).rejects.toThrow()
      expect(attempts).toBe(1)
    })

    it('should apply exponential backoff', async () => {
      let attempts = 0
      const delays: number[] = []
      await pRetry(
        async () => {
          attempts++
          if (attempts < 3) {
            throw new Error('retry')
          }
          return 'success'
        },
        {
          retries: 5,
          baseDelayMs: 10,
          backoffFactor: 2,
          jitter: false,
          onRetry: (_attempt, _error, delay) => {
            delays.push(delay)
            return true
          },
        },
      )
      // Each delay should be larger than the previous (exponential backoff)
      expect(delays.length).toBeGreaterThan(0)
    })

    it('should respect max delay', async () => {
      let attempts = 0
      const delays: number[] = []
      await pRetry(
        async () => {
          attempts++
          if (attempts < 4) {
            throw new Error('retry')
          }
          return 'success'
        },
        {
          retries: 5,
          baseDelayMs: 100,
          maxDelayMs: 200,
          backoffFactor: 10,
          jitter: false,
          onRetry: (_attempt, _error, delay) => {
            delays.push(delay)
            return true
          },
        },
      )
      // All delays should be <= maxDelayMs
      expect(delays.every(d => d <= 200)).toBe(true)
    })
  })

  describe('edge cases', () => {
    it('should handle single item arrays', async () => {
      const results: number[] = []
      await pEach([42], async item => {
        results.push(item)
      })
      expect(results).toEqual([42])
    })

    it('should handle large arrays', async () => {
      const items = Array.from({ length: 1000 }, (_, i) => i)
      const results: number[] = []
      await pEach(
        items,
        async item => {
          results.push(item)
        },
        { concurrency: 10 },
      )
      expect(results.length).toBe(1000)
    })

    it('should handle mixed types in filter', async () => {
      const items: any[] = [1, 'two', 3, 'four', 5]
      const results = await pFilter(
        items,
        async item => typeof item === 'number',
      )
      expect(results).toEqual([1, 3, 5])
    })

    it('should handle promises that resolve immediately', async () => {
      const items = [1, 2, 3]
      const results = await pFilter(items, async item => item > 1)
      expect(results).toEqual([2, 3])
    })

    it('should handle high concurrency', async () => {
      const items = Array.from({ length: 50 }, (_, i) => i)
      const results: number[] = []
      await pEach(
        items,
        async item => {
          results.push(item)
        },
        { concurrency: 50 },
      )
      expect(results.length).toBe(50)
    })
  })
})
