/**
 * @fileoverview GitHub utilities for Socket projects.
 * Provides GitHub API integration for repository operations.
 *
 * Authentication:
 * - getGitHubToken: Retrieve GitHub token from environment variables
 * - fetchGitHub: Authenticated GitHub API requests with rate limit handling
 *
 * Ref Resolution:
 * - resolveRefToSha: Convert tags/branches to commit SHAs (with memoization and persistent cache)
 * - clearRefCache: Clear the memoization cache
 *
 * Caching:
 * - In-memory cache for fast repeated lookups within the same process
 * - Persistent file-based cache (TTL: 5 minutes) for cross-invocation reuse
 * - Disable with DISABLE_GITHUB_CACHE env var
 *
 * Rate Limiting:
 * - Automatic rate limit detection and error messages
 * - Cache to minimize API calls
 */

import { existsSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'

import { readJson, safeStatsSync, writeJson } from './fs'
import { getSocketRegistryGithubCacheDir } from './paths'

import type { JsonContent } from './fs'

const GITHUB_API_BASE = 'https://api.github.com'
// 5 minutes.
const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000

// In-memory cache for resolved SHAs to minimize API calls within same process.
const refCache = new Map<string, string>()

// Cache directory path.
// Lazily resolved.
let _githubCachePath: string | undefined

export interface GitHubFetchOptions {
  token?: string | undefined
  headers?: Record<string, string> | undefined
}

export interface GitHubRateLimitError extends Error {
  status: number
  resetTime?: Date | undefined
}

/**
 * Get GitHub token from environment variables.
 */
export function getGitHubToken(): string | undefined {
  const { env } = process
  return (
    env['GITHUB_TOKEN'] ||
    env['GH_TOKEN'] ||
    env['SOCKET_CLI_GITHUB_TOKEN'] ||
    undefined
  )
}

/**
 * Fetch data from GitHub API with rate limit handling.
 */
export async function fetchGitHub<T = any>(
  url: string,
  options?: GitHubFetchOptions | undefined,
): Promise<T> {
  const opts = { __proto__: null, ...options } as GitHubFetchOptions
  const token = opts.token || getGitHubToken()

  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'socket-registry-github-client',
    ...opts.headers,
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(url, { headers })

  if (!response.ok) {
    if (response.status === 403) {
      const rateLimit = response.headers.get('X-RateLimit-Remaining')
      if (rateLimit === '0') {
        const resetTime = response.headers.get('X-RateLimit-Reset')
        const resetDate = resetTime
          ? new Date(Number(resetTime) * 1000)
          : undefined
        const error = new Error(
          `GitHub API rate limit exceeded${resetDate ? `. Resets at ${resetDate.toLocaleString()}` : ''}. Use GITHUB_TOKEN environment variable to increase rate limit.`,
        ) as GitHubRateLimitError
        error.status = 403
        error.resetTime = resetDate
        throw error
      }
    }
    throw new Error(
      `GitHub API error ${response.status}: ${response.statusText}`,
    )
  }

  return (await response.json()) as T
}

export interface GitHubRef {
  object: {
    sha: string
    type: string
    url: string
  }
  ref: string
  url: string
}

export interface GitHubTag {
  message: string
  object: {
    sha: string
    type: string
    url: string
  }
  sha: string
  tag: string
  tagger?: {
    date: string
    email: string
    name: string
  }
  url: string
}

export interface GitHubCommit {
  sha: string
  url: string
  commit: {
    message: string
    author: {
      date: string
      email: string
      name: string
    }
  }
}

export interface ResolveRefOptions {
  cache?: boolean | undefined
  cachePath?: string | undefined
  token?: string | undefined
  ttl?: number | undefined
}

/**
 * Get the GitHub cache directory path.
 */
function getGithubCachePath(customPath?: string | undefined): string {
  if (customPath) {
    return customPath
  }
  if (_githubCachePath === undefined) {
    _githubCachePath = getSocketRegistryGithubCacheDir()
  }
  return _githubCachePath
}

/**
 * Read cached data from file system.
 */
async function readCache(
  key: string,
  ttlMs: number,
  cachePath?: string | undefined,
): Promise<JsonContent | undefined> {
  try {
    const cacheDir = getGithubCachePath(cachePath)
    const cacheJsonPath = path.join(cacheDir, `${key}.json`)
    const stat = safeStatsSync(cacheJsonPath)
    if (stat) {
      const isExpired = Date.now() - Number(stat.mtimeMs) > ttlMs
      if (!isExpired) {
        return await readJson(cacheJsonPath)
      }
    }
  } catch {}
  return undefined
}

/**
 * Write data to cache file system.
 */
async function writeCache(
  key: string,
  data: JsonContent,
  cachePath?: string | undefined,
): Promise<void> {
  try {
    const cacheDir = getGithubCachePath(cachePath)
    if (!existsSync(cacheDir)) {
      await mkdir(cacheDir, { recursive: true })
    }
    const cacheJsonPath = path.join(cacheDir, `${key}.json`)
    await writeJson(cacheJsonPath, data)
  } catch {}
}

/**
 * Cache fetch wrapper with TTL support.
 */
async function cacheFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: {
    cachePath?: string | undefined
    ttl?: number | undefined
  },
): Promise<T> {
  const opts = { __proto__: null, ...options } as {
    cachePath?: string | undefined
    ttl: number
  }
  const ttl = opts.ttl ?? DEFAULT_CACHE_TTL_MS

  // Optionally disable cache.
  if (process.env['DISABLE_GITHUB_CACHE']) {
    return await fetcher()
  }

  let data = (await readCache(key, ttl, opts.cachePath)) as T | undefined
  if (!data) {
    data = await fetcher()
    await writeCache(key, data as JsonContent, opts.cachePath)
  }
  return data
}

/**
 * Resolve a git ref (tag, branch, or commit SHA) to its full commit SHA.
 * Results are cached in-memory and on disk (with TTL) to minimize API calls.
 */
export async function resolveRefToSha(
  owner: string,
  repo: string,
  ref: string,
  options?: ResolveRefOptions | undefined,
): Promise<string> {
  const opts = {
    __proto__: null,
    cache: true,
    ttl: DEFAULT_CACHE_TTL_MS,
    ...options,
  } as ResolveRefOptions

  const cacheKey = `${owner}/${repo}@${ref}`

  // Check in-memory cache first if caching is enabled.
  if (opts.cache && refCache.has(cacheKey)) {
    return refCache.get(cacheKey)!
  }

  // Use cacheFetch to check disk cache and fetch if needed.
  const sha = await cacheFetch(
    cacheKey,
    async () => {
      const fetchOptions: GitHubFetchOptions = {
        token: opts.token,
      }

      try {
        // Try as a tag first.
        const tagUrl = `${GITHUB_API_BASE}/repos/${owner}/${repo}/git/refs/tags/${ref}`
        const tagData = await fetchGitHub<GitHubRef>(tagUrl, fetchOptions)

        // Tag might point to a tag object or directly to a commit.
        if (tagData.object.type === 'tag') {
          // Dereference the tag object to get the commit.
          const tagObject = await fetchGitHub<GitHubTag>(
            tagData.object.url,
            fetchOptions,
          )
          return tagObject.object.sha
        }
        return tagData.object.sha
      } catch {
        // Not a tag, try as a branch.
        try {
          const branchUrl = `${GITHUB_API_BASE}/repos/${owner}/${repo}/git/refs/heads/${ref}`
          const branchData = await fetchGitHub<GitHubRef>(
            branchUrl,
            fetchOptions,
          )
          return branchData.object.sha
        } catch {
          // Try without refs/ prefix (for commit SHAs or other refs).
          try {
            const commitUrl = `${GITHUB_API_BASE}/repos/${owner}/${repo}/commits/${ref}`
            const commitData = await fetchGitHub<GitHubCommit>(
              commitUrl,
              fetchOptions,
            )
            return commitData.sha
          } catch (e) {
            throw new Error(
              `failed to resolve ref "${ref}" for ${owner}/${repo}: ${e instanceof Error ? e.message : String(e)}`,
            )
          }
        }
      }
    },
    {
      cachePath: opts.cachePath,
      ttl: opts.ttl,
    },
  )

  // Update in-memory cache if caching is enabled.
  if (opts.cache) {
    refCache.set(cacheKey, sha)
  }

  return sha
}

/**
 * Clear the ref resolution cache.
 */
export function clearRefCache(): void {
  refCache.clear()
}

/**
 * Get the current size of the ref cache.
 */
export function getRefCacheSize(): number {
  return refCache.size
}
