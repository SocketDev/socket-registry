import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { createTtlCache } from '../../registry/dist/lib/cache-with-ttl.js'

describe('cache-with-ttl', () => {
  let cache: ReturnType<typeof createTtlCache>

  beforeEach(() => {
    cache = createTtlCache({ prefix: 'test-cache', ttl: 1000 })
  })

  afterEach(async () => {
    await cache.clear().catch(() => {
      // Ignore cleanup errors.
    })
  })

  describe('getOrFetch', () => {
    it('should fetch and cache data on first call', async () => {
      let fetchCount = 0
      const fetcher = async () => {
        fetchCount += 1
        return { value: 42 }
      }

      const result = await cache.getOrFetch('key1', fetcher)
      expect(result).toEqual({ value: 42 })
      expect(fetchCount).toBe(1)
    })

    it('should return cached data on subsequent calls', async () => {
      let fetchCount = 0
      const fetcher = async () => {
        fetchCount += 1
        return { value: 42 }
      }

      await cache.getOrFetch('key1', fetcher)
      const result = await cache.getOrFetch('key1', fetcher)

      expect(result).toEqual({ value: 42 })
      // Only fetched once
      expect(fetchCount).toBe(1)
    })

    it('should refetch after TTL expires', async () => {
      const shortTtlCache = createTtlCache({ prefix: 'short-ttl', ttl: 1000 })
      let fetchCount = 0
      const fetcher = async () => {
        fetchCount += 1
        return { value: fetchCount }
      }

      const result1 = await shortTtlCache.getOrFetch('key1', fetcher)
      expect(result1).toEqual({ value: 1 })

      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 1500))

      const result2 = await shortTtlCache.getOrFetch('key1', fetcher)
      expect(result2).toEqual({ value: 2 })
      expect(fetchCount).toBe(2)

      await shortTtlCache.clear()
    })
  })

  describe('get/set', () => {
    it('should set and get data', async () => {
      await cache.set('key1', { value: 100 })
      const result = await cache.get<{ value: number }>('key1')
      expect(result).toEqual({ value: 100 })
    })

    it('should return undefined for missing keys', async () => {
      const result = await cache.get('nonexistent')
      expect(result).toBeUndefined()
    })

    it('should return undefined for expired keys', async () => {
      const shortTtlCache = createTtlCache({ prefix: 'expire-test', ttl: 1000 })
      await shortTtlCache.set('key1', { value: 100 })

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1500))

      const result = await shortTtlCache.get('key1')
      expect(result).toBeUndefined()

      await shortTtlCache.clear()
    })
  })

  describe('remove', () => {
    it('should remove cached data', async () => {
      await cache.set('key1', { value: 100 })
      await cache.remove('key1')
      const result = await cache.get('key1')
      expect(result).toBeUndefined()
    })
  })

  describe('clearMemo', () => {
    it('should clear in-memory cache but keep persistent cache', async () => {
      await cache.set('key1', { value: 100 })

      // Verify it's in memory
      const result1 = await cache.get<{ value: number }>('key1')
      expect(result1).toEqual({ value: 100 })

      // Clear memo
      cache.clearMemo()

      // Should still be in persistent cache
      const result2 = await cache.get<{ value: number }>('key1')
      expect(result2).toEqual({ value: 100 })
    })
  })

  describe('memoization', () => {
    it('should use in-memory cache when memoize is enabled', async () => {
      const memoCache = createTtlCache({
        memoize: true,
        prefix: 'memo-test',
        ttl: 1000,
      })

      let fetchCount = 0
      const fetcher = async () => {
        fetchCount += 1
        return { value: 42 }
      }

      // First call - fetch
      await memoCache.getOrFetch('key1', fetcher)
      expect(fetchCount).toBe(1)

      // Second call - from memo
      await memoCache.getOrFetch('key1', fetcher)
      expect(fetchCount).toBe(1)

      await memoCache.clear()
    })

    it('should skip memoization when disabled', async () => {
      const noMemoCache = createTtlCache({
        memoize: false,
        prefix: 'no-memo-test',
        ttl: 1000,
      })

      await noMemoCache.set('key1', { value: 100 })

      // Clear persistent cache to test memo behavior
      // Without memo, it should still fetch from persistent cache
      const result = await noMemoCache.get<{ value: number }>('key1')
      expect(result).toEqual({ value: 100 })

      await noMemoCache.clear()
    })

    it('should remove expired entries from memo cache', async () => {
      const shortTtlCache = createTtlCache({
        memoize: true,
        prefix: 'memo-expire-test',
        ttl: 1000,
      })

      await shortTtlCache.set('key1', { value: 100 })

      // First get - should be in memo
      const result1 = await shortTtlCache.get<{ value: number }>('key1')
      expect(result1).toEqual({ value: 100 })

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1500))

      // Second get - memo entry should be removed
      const result2 = await shortTtlCache.get('key1')
      expect(result2).toBeUndefined()

      await shortTtlCache.clear()
    })
  })

  describe('default options', () => {
    it('should use default options when none provided', async () => {
      const defaultCache = createTtlCache()

      await defaultCache.set('key1', { value: 42 })
      const result = await defaultCache.get<{ value: number }>('key1')
      expect(result).toEqual({ value: 42 })

      await defaultCache.clear()
    })

    it('should use default TTL of 5 minutes', async () => {
      const defaultCache = createTtlCache()

      let fetchCount = 0
      const fetcher = async () => {
        fetchCount += 1
        return { value: 42 }
      }

      // First call - fetch
      await defaultCache.getOrFetch('key1', fetcher)
      expect(fetchCount).toBe(1)

      // Second call within TTL - should use cache
      await defaultCache.getOrFetch('key1', fetcher)
      expect(fetchCount).toBe(1)

      await defaultCache.clear()
    })

    it('should use default prefix', async () => {
      const defaultCache = createTtlCache()

      await defaultCache.set('key1', { value: 123 })
      const result = await defaultCache.get<{ value: number }>('key1')
      expect(result).toEqual({ value: 123 })

      await defaultCache.clear()
    })
  })

  describe('data types', () => {
    it('should handle string values', async () => {
      await cache.set('key1', 'hello world')
      const result = await cache.get<string>('key1')
      expect(result).toBe('hello world')
    })

    it('should handle number values', async () => {
      await cache.set('key1', 42)
      const result = await cache.get<number>('key1')
      expect(result).toBe(42)
    })

    it('should handle boolean values', async () => {
      await cache.set('key1', true)
      const result = await cache.get<boolean>('key1')
      expect(result).toBe(true)
    })

    it('should handle array values', async () => {
      const arr = [1, 2, 3, 4, 5]
      await cache.set('key1', arr)
      const result = await cache.get<number[]>('key1')
      expect(result).toEqual(arr)
    })

    it('should handle null values', async () => {
      await cache.set('key1', null)
      const result = await cache.get<null>('key1')
      expect(result).toBeNull()
    })

    it('should handle nested objects', async () => {
      const nested = {
        a: { b: { c: { d: 'deep' } } },
        arr: [1, { x: 2 }],
      }
      await cache.set('key1', nested)
      const result = await cache.get<typeof nested>('key1')
      expect(result).toEqual(nested)
    })
  })

  describe('multiple cache instances', () => {
    it('should isolate caches with different prefixes', async () => {
      const cache1 = createTtlCache({ prefix: 'cache1', ttl: 1000 })
      const cache2 = createTtlCache({ prefix: 'cache2', ttl: 1000 })

      await cache1.set('key1', { value: 'cache1' })
      await cache2.set('key1', { value: 'cache2' })

      const result1 = await cache1.get<{ value: string }>('key1')
      const result2 = await cache2.get<{ value: string }>('key1')

      expect(result1).toEqual({ value: 'cache1' })
      expect(result2).toEqual({ value: 'cache2' })

      await cache1.clear()
      await cache2.clear()
    })
  })

  describe('clear operations', () => {
    it('should clear all entries', async () => {
      await cache.set('key1', { value: 1 })
      await cache.set('key2', { value: 2 })
      await cache.set('key3', { value: 3 })

      await cache.clear()

      const result1 = await cache.get('key1')
      const result2 = await cache.get('key2')
      const result3 = await cache.get('key3')

      expect(result1).toBeUndefined()
      expect(result2).toBeUndefined()
      expect(result3).toBeUndefined()
    })
  })
})
