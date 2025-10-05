/**
 * @fileoverview Generic TTL-based caching utility using cacache.
 *
 * Provides a simple interface for caching data with time-to-live (TTL) expiration.
 * Uses cacache for persistent storage with metadata for TTL tracking.
 *
 * Features:
 * - Automatic expiration based on TTL
 * - In-memory memoization for hot data
 * - Persistent storage across process restarts
 * - Type-safe with generics
 *
 * Usage:
 * ```ts
 * const cache = createTtlCache({ ttl: 5 * 60 * 1000 }) // 5 minutes
 * const data = await cache.getOrFetch('key', async () => fetchData())
 * ```
 */

import * as cacache from './cacache'

export interface TtlCacheOptions {
  /**
   * Time-to-live in milliseconds.
   * @default 5 * 60 * 1000 (5 minutes)
   */
  ttl?: number | undefined
  /**
   * Enable in-memory memoization for hot data.
   * @default true
   */
  memoize?: boolean | undefined
  /**
   * Custom cache key prefix.
   * @default 'ttl-cache'
   */
  prefix?: string | undefined
}

export interface TtlCacheEntry<T> {
  data: T
  expiresAt: number
}

export interface TtlCache {
  /**
   * Get cached data or fetch and cache if missing/expired.
   */
  getOrFetch<T>(key: string, fetcher: () => Promise<T>): Promise<T>
  /**
   * Get cached data without fetching.
   * Returns undefined if not found or expired.
   */
  get<T>(key: string): Promise<T | undefined>
  /**
   * Set cached data with TTL.
   */
  set<T>(key: string, data: T): Promise<void>
  /**
   * Remove a specific cache entry.
   */
  remove(key: string): Promise<void>
  /**
   * Clear all cache entries with this prefix.
   */
  clear(): Promise<void>
  /**
   * Clear in-memory memoization cache.
   */
  clearMemo(): void
}

// 5 minutes
const DEFAULT_TTL_MS = 5 * 60 * 1000
const DEFAULT_PREFIX = 'ttl-cache'

/**
 * Create a TTL-based cache instance.
 */
export function createTtlCache(options?: TtlCacheOptions): TtlCache {
  const opts = {
    __proto__: null,
    memoize: true,
    prefix: DEFAULT_PREFIX,
    ttl: DEFAULT_TTL_MS,
    ...options,
  } as Required<TtlCacheOptions>

  // In-memory cache for hot data
  const memoCache = new Map<string, TtlCacheEntry<any>>()

  // Ensure ttl is defined
  const ttl = opts.ttl ?? DEFAULT_TTL_MS

  /**
   * Build full cache key with prefix.
   */
  function buildKey(key: string): string {
    return `${opts.prefix}:${key}`
  }

  /**
   * Check if entry is expired.
   */
  function isExpired(entry: TtlCacheEntry<any>): boolean {
    return Date.now() > entry.expiresAt
  }

  /**
   * Get cached data without fetching.
   */
  async function get<T>(key: string): Promise<T | undefined> {
    const fullKey = buildKey(key)

    // Check in-memory cache first.
    if (opts.memoize) {
      const memoEntry = memoCache.get(fullKey)
      if (memoEntry && !isExpired(memoEntry)) {
        return memoEntry.data as T
      }
      // Remove expired memo entry.
      if (memoEntry) {
        memoCache.delete(fullKey)
      }
    }

    // Check persistent cache.
    const cacheEntry = await cacache.safeGet(fullKey)
    if (cacheEntry) {
      const entry = JSON.parse(
        cacheEntry.data.toString('utf8'),
      ) as TtlCacheEntry<T>
      if (!isExpired(entry)) {
        // Update in-memory cache.
        if (opts.memoize) {
          memoCache.set(fullKey, entry)
        }
        return entry.data
      }
      // Remove expired entry.
      await cacache.remove(fullKey)
    }

    return undefined
  }

  /**
   * Set cached data with TTL.
   */
  async function set<T>(key: string, data: T): Promise<void> {
    const fullKey = buildKey(key)
    const entry: TtlCacheEntry<T> = {
      data,
      expiresAt: Date.now() + ttl,
    }

    // Update in-memory cache.
    if (opts.memoize) {
      memoCache.set(fullKey, entry)
    }

    // Update persistent cache.
    await cacache.put(fullKey, JSON.stringify(entry), {
      metadata: { expiresAt: entry.expiresAt },
    })
  }

  /**
   * Get cached data or fetch and cache if missing/expired.
   */
  async function getOrFetch<T>(
    key: string,
    fetcher: () => Promise<T>,
  ): Promise<T> {
    const cached = await get<T>(key)
    if (cached !== undefined) {
      return cached
    }

    const data = await fetcher()
    await set(key, data)
    return data
  }

  /**
   * Remove a specific cache entry.
   */
  async function remove(key: string): Promise<void> {
    const fullKey = buildKey(key)
    memoCache.delete(fullKey)
    await cacache.remove(fullKey)
  }

  /**
   * Clear all cache entries with this prefix.
   */
  async function clear(): Promise<void> {
    // Clear in-memory cache.
    memoCache.clear()
    // Note: This clears ALL cacache entries, not just ones with our prefix.
    // For a more targeted approach, we'd need to enumerate and filter keys.
    await cacache.clear()
  }

  /**
   * Clear in-memory memoization cache only.
   */
  function clearMemo(): void {
    memoCache.clear()
  }

  return {
    clear,
    clearMemo,
    get,
    getOrFetch,
    remove,
    set,
  }
}
