/** @fileoverview Cacache utilities for Socket ecosystem shared content-addressable cache. */

import { getCacache as getCacacheDep } from './dependencies/file-system'
import { getSocketCacacheDir } from './paths'

export interface GetOptions {
  integrity?: string | undefined
  size?: number | undefined
  memoize?: boolean | undefined
}

export interface PutOptions {
  integrity?: string | undefined
  size?: number | undefined
  metadata?: any | undefined
  memoize?: boolean | undefined
}

export interface CacheEntry {
  data: Buffer
  integrity: string
  key: string
  metadata?: any | undefined
  path: string
  size: number
  time: number
}

/**
 * Get the cacache module for cache operations.
 */
function getCacache() {
  return getCacacheDep()
}

/**
 * Clear all entries from the Socket shared cache.
 */
export async function clear() {
  const cacache = getCacache()
  return await cacache.rm.all(getSocketCacacheDir())
}

/**
 * Get data from the Socket shared cache by key.
 * @throws {Error} When cache entry is not found.
 */
export async function get(
  key: string,
  options?: GetOptions | undefined,
): Promise<CacheEntry> {
  const cacache = getCacache() as any
  return await cacache.get(getSocketCacacheDir(), key, options)
}

/**
 * Put data into the Socket shared cache with a key.
 */
export async function put(
  key: string,
  data: string | Buffer,
  options?: PutOptions | undefined,
) {
  const cacache = getCacache()
  return await cacache.put(getSocketCacacheDir(), key, data, options)
}

/**
 * Remove an entry from the Socket shared cache by key.
 */
export async function remove(key: string): Promise<unknown> {
  const cacache = getCacache() as any
  return await cacache.rm.entry(getSocketCacacheDir(), key)
}

/**
 * Get data from the Socket shared cache by key without throwing.
 */
export async function safeGet(
  key: string,
  options?: GetOptions | undefined,
): Promise<CacheEntry | undefined> {
  try {
    return await get(key, options)
  } catch {
    return undefined
  }
}

/**
 * Execute a callback with a temporary directory for cache operations.
 */
export async function withTmp<T>(
  callback: (tmpDirPath: string) => Promise<T>,
): Promise<T> {
  const cacache = getCacache()
  // The DefinitelyTyped types for cacache.tmp.withTmp are incorrect.
  // It actually returns the callback's return value, not void.
  return (await cacache.tmp.withTmp(
    getSocketCacacheDir(),
    {},
    callback as any,
  )) as T
}
