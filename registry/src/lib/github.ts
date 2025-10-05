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
 * - clearRefCache: Clear the in-memory memoization cache
 *
 * Caching:
 * - Uses cacache for persistent storage with in-memory memoization
 * - Two-tier caching: in-memory (Map) for hot data, persistent (cacache) for durability
 * - Default TTL: 5 minutes
 * - Disable with DISABLE_GITHUB_CACHE env var
 *
 * Rate Limiting:
 * - Automatic rate limit detection and error messages
 * - Cache to minimize API calls
 */

import { createTtlCache } from './cache-with-ttl'
import GITHUB_API_BASE_URL from './constants/GITHUB_API_BASE_URL'
import { httpRequest } from './http-request'

import type { TtlCache } from './cache-with-ttl'
// 5 minutes.
const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000

// Create TTL cache instance for GitHub ref resolution.
// Uses cacache for persistent storage with in-memory memoization.
let _githubCache: TtlCache | undefined

/**
 * Get or create the GitHub cache instance.
 */
function getGithubCache(): TtlCache {
  if (_githubCache === undefined) {
    _githubCache = createTtlCache({
      memoize: true,
      prefix: 'github-refs',
      ttl: DEFAULT_CACHE_TTL_MS,
    })
  }
  return _githubCache
}

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

  const response = await httpRequest(url, { headers })

  if (!response.ok) {
    if (response.status === 403) {
      const rateLimit = response.headers['x-ratelimit-remaining']
      const rateLimitStr =
        typeof rateLimit === 'string' ? rateLimit : rateLimit?.[0]
      if (rateLimitStr === '0') {
        const resetTime = response.headers['x-ratelimit-reset']
        const resetTimeStr =
          typeof resetTime === 'string' ? resetTime : resetTime?.[0]
        const resetDate = resetTimeStr
          ? new Date(Number(resetTimeStr) * 1000)
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

  return JSON.parse(response.body.toString('utf8')) as T
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
  token?: string | undefined
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
    ...options,
  } as ResolveRefOptions

  const cacheKey = `${owner}/${repo}@${ref}`

  // Optionally disable cache.
  if (process.env['DISABLE_GITHUB_CACHE']) {
    return await fetchRefSha(owner, repo, ref, opts)
  }

  // Use TTL cache for persistent storage and in-memory memoization.
  const cache = getGithubCache()
  return await cache.getOrFetch(cacheKey, async () => {
    return await fetchRefSha(owner, repo, ref, opts)
  })
}

/**
 * Fetch the SHA for a git ref from GitHub API.
 */
async function fetchRefSha(
  owner: string,
  repo: string,
  ref: string,
  options: ResolveRefOptions,
): Promise<string> {
  const fetchOptions: GitHubFetchOptions = {
    token: options.token,
  }

  try {
    // Try as a tag first.
    const tagUrl = `${GITHUB_API_BASE_URL}/repos/${owner}/${repo}/git/refs/tags/${ref}`
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
      const branchUrl = `${GITHUB_API_BASE_URL}/repos/${owner}/${repo}/git/refs/heads/${ref}`
      const branchData = await fetchGitHub<GitHubRef>(branchUrl, fetchOptions)
      return branchData.object.sha
    } catch {
      // Try without refs/ prefix (for commit SHAs or other refs).
      try {
        const commitUrl = `${GITHUB_API_BASE_URL}/repos/${owner}/${repo}/commits/${ref}`
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
}

/**
 * Clear the ref resolution cache (in-memory only).
 */
export function clearRefCache(): void {
  if (_githubCache) {
    _githubCache.clearMemo()
  }
}
