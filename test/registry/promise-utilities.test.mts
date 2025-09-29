import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  normalizeIterationOptions,
  normalizeRetryOptions,
  pEach,
  pEachChunk,
  pFilter,
  pFilterChunk,
  pRetry,
  resolveRetryOptions,
} from '../../registry/dist/lib/promises.js'

describe('promise utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('resolveRetryOptions', () => {
    it('should resolve number to retry options', () => {
      const result = resolveRetryOptions(3)
      expect(result.retries).toBe(3)
      expect(result.minTimeout).toBe(200)
      expect(result.maxTimeout).toBe(10000)
      expect(result.factor).toBe(2)
    })

    it('should resolve options object', () => {
      const options = { retries: 5, minTimeout: 100, maxTimeout: 5000 }
      const result = resolveRetryOptions(options)
      expect(result.retries).toBe(5)
      expect(result.minTimeout).toBe(100)
      expect(result.maxTimeout).toBe(5000)
      // Default
      expect(result.factor).toBe(2)
    })

    it('should return defaults when no options provided', () => {
      const result = resolveRetryOptions()
      expect(result.retries).toBe(0)
      expect(result.minTimeout).toBe(200)
      expect(result.maxTimeout).toBe(10000)
      expect(result.factor).toBe(2)
    })

    it('should merge with defaults', () => {
      const result = resolveRetryOptions({ retries: 2 })
      expect(result.retries).toBe(2)
      // Default
      expect(result.minTimeout).toBe(200)
      // Default
      expect(result.maxTimeout).toBe(10000)
      // Default
      expect(result.factor).toBe(2)
    })
  })

  describe('normalizeRetryOptions', () => {
    it('should normalize retry options with defaults', () => {
      const result = normalizeRetryOptions()
      expect(result.retries).toBe(0)
      expect(result.baseDelayMs).toBe(200)
      expect(result.maxDelayMs).toBe(10000)
      expect(result.backoffFactor).toBe(2)
      expect(result.jitter).toBe(true)
      expect(result.args).toEqual([])
    })

    it('should handle number input', () => {
      const result = normalizeRetryOptions(3)
      expect(result.retries).toBe(3)
      expect(result.baseDelayMs).toBe(200)
    })

    it('should handle object input with custom values', () => {
      const options = {
        retries: 5,
        baseDelayMs: 100,
        maxDelayMs: 5000,
        backoffFactor: 1.5,
        jitter: false,
        args: ['test'],
      }
      const result = normalizeRetryOptions(options)
      expect(result.retries).toBe(5)
      expect(result.baseDelayMs).toBe(100)
      expect(result.maxDelayMs).toBe(5000)
      expect(result.backoffFactor).toBe(1.5)
      expect(result.jitter).toBe(false)
      expect(result.args).toEqual(['test'])
    })

    it('should include callback options', () => {
      const onRetry = vi.fn()
      const result = normalizeRetryOptions({
        onRetry,
        onRetryCancelOnFalse: true,
        onRetryRethrow: true,
      })
      expect(result.onRetry).toBe(onRetry)
      expect(result.onRetryCancelOnFalse).toBe(true)
      expect(result.onRetryRethrow).toBe(true)
    })
  })

  describe('normalizeIterationOptions', () => {
    it('should handle number as concurrency shorthand', () => {
      const result = normalizeIterationOptions(5)
      expect(result.concurrency).toBe(5)
      expect(result.retries).toBeDefined()
      expect(result.signal).toBeDefined()
    })

    it('should handle options object', () => {
      const result = normalizeIterationOptions({ concurrency: 3, retries: 2 })
      expect(result.concurrency).toBe(3)
      expect(result.retries.retries).toBe(2)
    })

    it('should enforce minimum concurrency of 1', () => {
      const result = normalizeIterationOptions({ concurrency: 0 })
      expect(result.concurrency).toBe(1)

      const result2 = normalizeIterationOptions({ concurrency: -5 })
      expect(result2.concurrency).toBe(1)
    })

    it('should provide defaults', () => {
      const result = normalizeIterationOptions()
      expect(result.concurrency).toBe(1)
      expect(result.retries).toBeDefined()
      expect(result.signal).toBeDefined()
    })
  })

  describe('pRetry', () => {
    it('should succeed on first attempt', async () => {
      const fn = vi.fn().mockResolvedValue('success')
      const result = await pRetry(fn, { retries: 3 })
      expect(result).toBe('success')
      expect(fn).toHaveBeenCalledTimes(1)
    })

    it('should not retry when retries is 0', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('fail'))
      await expect(pRetry(fn, { retries: 0 })).rejects.toThrow('fail')
      expect(fn).toHaveBeenCalledTimes(1)
    })

    it('should retry on failure', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error('fail1'))
        .mockRejectedValueOnce(new Error('fail2'))
        .mockResolvedValue('success')

      const result = await pRetry(fn, { retries: 3, baseDelayMs: 1 })
      expect(result).toBe('success')
      expect(fn).toHaveBeenCalledTimes(3)
    })

    it('should throw last error when all retries fail', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('persistent failure'))
      await expect(pRetry(fn, { retries: 2, baseDelayMs: 1 })).rejects.toThrow(
        'persistent failure',
      )
      // Initial + 2 retries
      expect(fn).toHaveBeenCalledTimes(3)
    })

    it('should pass arguments to function', async () => {
      const fn = vi.fn().mockResolvedValue('success')
      await pRetry(fn, { args: ['arg1', 'arg2'] })
      expect(fn).toHaveBeenCalledWith(
        'arg1',
        'arg2',
        expect.objectContaining({ signal: expect.anything() }),
      )
    })

    it('should call onRetry callback', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValue('success')
      const onRetry = vi.fn()

      await pRetry(fn, { retries: 1, baseDelayMs: 1, onRetry })
      expect(onRetry).toHaveBeenCalledWith(
        1,
        expect.any(Error),
        expect.any(Number),
      )
    })

    it('should cancel retries when onRetry returns false', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('fail'))
      const onRetry = vi.fn().mockReturnValue(false)

      await expect(
        pRetry(fn, {
          retries: 3,
          baseDelayMs: 1,
          onRetry,
          onRetryCancelOnFalse: true,
        }),
      ).rejects.toThrow('fail')

      expect(fn).toHaveBeenCalledTimes(1)
      expect(onRetry).toHaveBeenCalledTimes(1)
    })

    it('should handle onRetry throwing when onRetryRethrow is true', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('original'))
      const onRetry = vi.fn().mockImplementation(() => {
        throw new Error('onRetry error')
      })

      await expect(
        pRetry(fn, {
          retries: 1,
          baseDelayMs: 1,
          onRetry,
          onRetryRethrow: true,
        }),
      ).rejects.toThrow('onRetry error')
    })

    it('should handle AbortSignal', async () => {
      const controller = new AbortController()
      const fn = vi
        .fn()
        .mockImplementation(
          () => new Promise(resolve => setTimeout(resolve, 100)),
        )

      controller.abort()

      const result = await pRetry(fn, { signal: controller.signal })
      expect(result).toBeUndefined()
      expect(fn).not.toHaveBeenCalled()
    })
  })

  describe('pEach', () => {
    it('should process all items sequentially by default', async () => {
      const items = [1, 2, 3]
      const results: number[] = []
      const fn = vi.fn().mockImplementation(async (item: number) => {
        results.push(item)
      })

      await pEach(items, fn)
      expect(fn).toHaveBeenCalledTimes(3)
      expect(results).toEqual([1, 2, 3])
    })

    it('should process items with concurrency', async () => {
      const items = [1, 2, 3, 4, 5]
      const fn = vi.fn().mockImplementation(async (_item: number) => {
        // Small delay to test concurrency
        await new Promise(resolve => setTimeout(resolve, 10))
      })

      await pEach(items, fn, { concurrency: 2 })
      expect(fn).toHaveBeenCalledTimes(5)
    })

    it('should handle empty array', async () => {
      const fn = vi.fn()
      await pEach([], fn)
      expect(fn).not.toHaveBeenCalled()
    })

    it('should handle AbortSignal', async () => {
      const controller = new AbortController()
      const items = [1, 2, 3]
      const fn = vi.fn()

      controller.abort()

      await pEach(items, fn, { signal: controller.signal })
      expect(fn).not.toHaveBeenCalled()
    })

    it('should retry failed items', async () => {
      const items = [1, 2]
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(undefined)

      await pEach(items, fn, { retries: 1 })
      // Initial fail + retry + second item
      expect(fn).toHaveBeenCalledTimes(3)
    })
  })

  describe('pEachChunk', () => {
    it('should process array in chunks', async () => {
      const items = [1, 2, 3, 4, 5]
      const processedChunks: number[][] = []
      const fn = vi.fn().mockImplementation(async (chunk: number[]) => {
        processedChunks.push(chunk)
      })

      await pEachChunk(items, fn, { chunkSize: 2 })
      // [1,2], [3,4], [5]
      expect(fn).toHaveBeenCalledTimes(3)
      expect(processedChunks).toEqual([[1, 2], [3, 4], [5]])
    })

    it('should use default chunk size', async () => {
      const items = Array(150)
        .fill(0)
        .map((_, i) => i)
      const fn = vi.fn()

      await pEachChunk(items, fn)
      // 100 + 50
      expect(fn).toHaveBeenCalledTimes(2)
    })

    it('should handle AbortSignal', async () => {
      const controller = new AbortController()
      const items = [1, 2, 3, 4]
      const fn = vi.fn()

      controller.abort()

      await pEachChunk(items, fn, { signal: controller.signal, chunkSize: 2 })
      expect(fn).not.toHaveBeenCalled()
    })
  })

  describe('pFilter', () => {
    it('should filter array based on predicate', async () => {
      const items = [1, 2, 3, 4, 5]
      const predicate = vi
        .fn()
        .mockImplementation(async (item: number) => item % 2 === 0)

      const result = await pFilter(items, predicate)
      expect(result).toEqual([2, 4])
      expect(predicate).toHaveBeenCalledTimes(5)
    })

    it('should handle concurrency', async () => {
      const items = [1, 2, 3, 4, 5, 6]
      const predicate = vi
        .fn()
        .mockImplementation(async (item: number) => item > 3)

      const result = await pFilter(items, predicate, { concurrency: 2 })
      expect(result).toEqual([4, 5, 6])
    })

    it('should handle empty array', async () => {
      const predicate = vi.fn()
      const result = await pFilter([], predicate)
      expect(result).toEqual([])
      expect(predicate).not.toHaveBeenCalled()
    })

    it('should filter with all false predicates', async () => {
      const items = [1, 2, 3]
      const predicate = vi.fn().mockResolvedValue(false)

      const result = await pFilter(items, predicate)
      expect(result).toEqual([])
    })

    it('should filter with all true predicates', async () => {
      const items = [1, 2, 3]
      const predicate = vi.fn().mockResolvedValue(true)

      const result = await pFilter(items, predicate)
      expect(result).toEqual([1, 2, 3])
    })
  })

  describe('pFilterChunk', () => {
    it('should filter chunked arrays', async () => {
      const chunks = [
        [1, 2, 3],
        [4, 5, 6],
      ]
      const predicate = vi
        .fn()
        .mockImplementation(async (item: number) => item % 2 === 0)

      const result = await pFilterChunk(chunks, predicate)
      expect(result).toEqual([[2], [4, 6]])
    })

    it('should handle empty chunks', async () => {
      const chunks: number[][] = [[], [1, 2], []]
      const predicate = vi
        .fn()
        .mockImplementation(async (item: number) => item > 1)

      const result = await pFilterChunk(chunks, predicate)
      expect(result).toEqual([[], [2], []])
    })

    it('should handle AbortSignal', async () => {
      const controller = new AbortController()
      const chunks = [
        [1, 2],
        [3, 4],
      ]
      const predicate = vi.fn()

      controller.abort()

      const result = await pFilterChunk(chunks, predicate, {
        signal: controller.signal,
      })
      expect(result).toEqual([[], []])
      expect(predicate).not.toHaveBeenCalled()
    })
  })

  describe('lazy loading', () => {
    it('should lazy load timers module', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValue('success')
      const result = await pRetry(fn, { retries: 1, baseDelayMs: 1 })
      expect(result).toBe('success')
    })
  })

  describe('edge cases', () => {
    it('should handle very small delays', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValue('success')
      const result = await pRetry(fn, { retries: 1, baseDelayMs: 0 })
      expect(result).toBe('success')
    })

    it('should handle jitter disabled', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValue('success')
      const result = await pRetry(fn, {
        retries: 1,
        baseDelayMs: 1,
        jitter: false,
      })
      expect(result).toBe('success')
    })

    it('should cap delay at maxDelayMs', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error('fail1'))
        .mockRejectedValueOnce(new Error('fail2'))
        .mockResolvedValue('success')

      const result = await pRetry(fn, {
        retries: 2,
        baseDelayMs: 1000,
        maxDelayMs: 50,
        backoffFactor: 10,
      })
      expect(result).toBe('success')
    })

    it('should handle single item arrays', async () => {
      const fn = vi.fn().mockResolvedValue(undefined)
      await pEach([1], fn)
      expect(fn).toHaveBeenCalledTimes(1)
    })

    it('should handle pFilter with mixed results', async () => {
      const items = [1, 2, 3, 4]
      const predicate = vi
        .fn()
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false)

      const result = await pFilter(items, predicate)
      expect(result).toEqual([1, 3])
    })
  })
})
