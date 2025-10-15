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

import type { TtlCache } from './cache-with-ttl'
import { createTtlCache } from './cache-with-ttl'
import { httpRequest } from './http-request'
import type { SpawnOptions } from './spawn'
import { spawn } from './spawn'

// GitHub API base URL constant (inlined for coverage mode compatibility).
const GITHUB_API_BASE_URL = 'https://api.github.com'

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
export async function fetchGitHub<T = unknown>(
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
export async function clearRefCache(): Promise<void> {
  if (_githubCache) {
    await _githubCache.clear({ memoOnly: true })
  }
}

/**
 * Get GitHub token from git config if not in environment.
 * Falls back to checking git config for github.token.
 */
export async function getGitHubTokenFromGitConfig(
  options?: SpawnOptions,
): Promise<string | undefined> {
  try {
    const result = await spawn('git', ['config', 'github.token'], {
      ...options,
      stdio: 'pipe',
    })
    if (result.code === 0 && result.stdout) {
      return result.stdout.toString().trim()
    }
  } catch {
    // Ignore errors - git config may not have token.
  }
  return undefined
}

/**
 * Get GitHub token from all available sources.
 * Checks environment variables first, then git config.
 */
export async function getGitHubTokenWithFallback(): Promise<
  string | undefined
> {
  return getGitHubToken() || (await getGitHubTokenFromGitConfig())
}

// GHSA (GitHub Security Advisory) types and utilities.
export interface GhsaDetails {
  ghsaId: string
  summary: string
  details: string
  severity: string
  aliases: string[]
  publishedAt: string
  updatedAt: string
  withdrawnAt: string | null
  references: Array<{ url: string }>
  vulnerabilities: Array<{
    package: {
      ecosystem: string
      name: string
    }
    vulnerableVersionRange: string
    firstPatchedVersion: { identifier: string } | null
  }>
  cvss: {
    score: number
    vectorString: string
  } | null
  cwes: Array<{
    cweId: string
    name: string
    description: string
  }>
}

/**
 * Generate GitHub Security Advisory URL from GHSA ID.
 */
export function getGhsaUrl(ghsaId: string): string {
  return `https://github.com/advisories/${ghsaId}`
}

/**
 * Fetch GitHub Security Advisory details.
 */
export async function fetchGhsaDetails(
  ghsaId: string,
  options?: GitHubFetchOptions,
): Promise<GhsaDetails> {
  const url = `https://api.github.com/advisories/${ghsaId}`
  const data = await fetchGitHub<{
    aliases?: string[]
    cvss: unknown
    cwes?: Array<{ cweId: string; name: string; description: string }>
    details: string
    ghsa_id: string
    published_at: string
    references?: Array<{ url: string }>
    severity: string
    summary: string
    updated_at: string
    vulnerabilities?: Array<{
      package: { ecosystem: string; name: string }
      vulnerableVersionRange: string
      firstPatchedVersion: { identifier: string } | null
    }>
    withdrawn_at: string
  }>(url, options)

  return {
    ghsaId: data.ghsa_id,
    summary: data.summary,
    details: data.details,
    severity: data.severity,
    aliases: data.aliases || [],
    publishedAt: data.published_at,
    updatedAt: data.updated_at,
    withdrawnAt: data.withdrawn_at,
    references: data.references || [],
    vulnerabilities: data.vulnerabilities || [],
    cvss: data.cvss as { score: number; vectorString: string } | null,
    cwes: data.cwes || [],
  }
}

/**
 * Cached fetch for GHSA details.
 */
export async function cacheFetchGhsa(
  ghsaId: string,
  options?: GitHubFetchOptions,
): Promise<GhsaDetails> {
  const cache = getGithubCache()
  const key = `ghsa:${ghsaId}`

  // Check cache first.
  if (!process.env['DISABLE_GITHUB_CACHE']) {
    const cached = await cache.get(key)
    if (cached) {
      return JSON.parse(cached as string) as GhsaDetails
    }
  }

  // Fetch and cache.
  const data = await fetchGhsaDetails(ghsaId, options)
  await cache.set(key, JSON.stringify(data))
  return data
}
