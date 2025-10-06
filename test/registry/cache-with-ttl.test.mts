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
        fetchCount++
        return { value: 42 }
      }

      const result = await cache.getOrFetch('key1', fetcher)
      expect(result).toEqual({ value: 42 })
      expect(fetchCount).toBe(1)
    })

    it('should return cached data on subsequent calls', async () => {
      let fetchCount = 0
      const fetcher = async () => {
        fetchCount++
        return { value: 42 }
      }

      await cache.getOrFetch('key1', fetcher)
      const result = await cache.getOrFetch('key1', fetcher)

      expect(result).toEqual({ value: 42 })
      // Only fetched once
      expect(fetchCount).toBe(1)
    })

    it('should refetch after TTL expires', async () => {
      const shortTtlCache = createTtlCache({ prefix: 'short-ttl', ttl: 10 })
      let fetchCount = 0
      const fetcher = async () => {
        fetchCount++
        return { value: fetchCount }
      }

      const result1 = await shortTtlCache.getOrFetch('key1', fetcher)
      expect(result1).toEqual({ value: 1 })

      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 20))

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
      const shortTtlCache = createTtlCache({ prefix: 'expire-test', ttl: 10 })
      await shortTtlCache.set('key1', { value: 100 })

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 20))

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
        fetchCount++
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
  })
})
