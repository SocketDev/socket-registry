import { mkdtempSync, rmSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  clearRefCache,
  fetchGitHub,
  getGitHubToken,
  getRefCacheSize,
  resolveRefToSha,
} from '../../registry/dist/lib/github'

describe('github module', () => {
  let originalEnv: NodeJS.ProcessEnv
  let tempDir: string

  beforeEach(() => {
    originalEnv = { ...process.env }
    clearRefCache()
    tempDir = mkdtempSync(path.join(os.tmpdir(), 'github-test-'))
  })

  afterEach(() => {
    process.env = originalEnv
    clearRefCache()
    try {
      rmSync(tempDir, { recursive: true, force: true })
    } catch {}
  })

  describe('getGitHubToken', () => {
    it('should return GITHUB_TOKEN if set', () => {
      process.env['GITHUB_TOKEN'] = 'test-token-1'
      expect(getGitHubToken()).toBe('test-token-1')
    })

    it('should return GH_TOKEN if GITHUB_TOKEN not set', () => {
      delete process.env['GITHUB_TOKEN']
      process.env['GH_TOKEN'] = 'test-token-2'
      expect(getGitHubToken()).toBe('test-token-2')
    })

    it('should return SOCKET_CLI_GITHUB_TOKEN if neither GITHUB_TOKEN nor GH_TOKEN set', () => {
      delete process.env['GITHUB_TOKEN']
      delete process.env['GH_TOKEN']
      process.env['SOCKET_CLI_GITHUB_TOKEN'] = 'test-token-3'
      expect(getGitHubToken()).toBe('test-token-3')
    })

    it('should return undefined if no tokens set', () => {
      delete process.env['GITHUB_TOKEN']
      delete process.env['GH_TOKEN']
      delete process.env['SOCKET_CLI_GITHUB_TOKEN']
      expect(getGitHubToken()).toBeUndefined()
    })

    it('should prioritize GITHUB_TOKEN over others', () => {
      process.env['GITHUB_TOKEN'] = 'token-1'
      process.env['GH_TOKEN'] = 'token-2'
      process.env['SOCKET_CLI_GITHUB_TOKEN'] = 'token-3'
      expect(getGitHubToken()).toBe('token-1')
    })
  })

  describe('fetchGitHub', () => {
    it('should fetch data from GitHub API', async () => {
      const mockData = { data: 'test' }
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockData,
      })

      const result = await fetchGitHub('https://api.github.com/test')
      expect(result).toEqual(mockData)
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.github.com/test',
        expect.objectContaining({
          headers: expect.objectContaining({
            Accept: 'application/vnd.github.v3+json',
            'User-Agent': 'socket-registry-github-client',
          }),
        }),
      )
    })

    it('should include Authorization header when token provided', async () => {
      const mockData = { data: 'test' }
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockData,
      })

      await fetchGitHub('https://api.github.com/test', { token: 'my-token' })
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.github.com/test',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer my-token',
          }),
        }),
      )
    })

    it('should use environment token if no token provided', async () => {
      process.env['GITHUB_TOKEN'] = 'env-token'
      const mockData = { data: 'test' }
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockData,
      })

      await fetchGitHub('https://api.github.com/test')
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.github.com/test',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer env-token',
          }),
        }),
      )
    })

    it('should throw rate limit error with reset time', async () => {
      const resetTime = Math.floor(Date.now() / 1000) + 3600
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        headers: new Map([
          ['X-RateLimit-Remaining', '0'],
          ['X-RateLimit-Reset', String(resetTime)],
        ]),
      })

      await expect(fetchGitHub('https://api.github.com/test')).rejects.toThrow(
        /GitHub API rate limit exceeded/,
      )
    })

    it('should throw rate limit error without reset time', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        headers: new Map([['X-RateLimit-Remaining', '0']]),
      })

      await expect(fetchGitHub('https://api.github.com/test')).rejects.toThrow(
        /GitHub API rate limit exceeded/,
      )
    })

    it('should throw generic error for non-rate-limit failures', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: new Map(),
      })

      await expect(fetchGitHub('https://api.github.com/test')).rejects.toThrow(
        'GitHub API error 404: Not Found',
      )
    })

    it('should include custom headers', async () => {
      const mockData = { data: 'test' }
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockData,
      })

      await fetchGitHub('https://api.github.com/test', {
        headers: { 'X-Custom': 'value' },
      })
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.github.com/test',
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Custom': 'value',
          }),
        }),
      )
    })
  })

  describe('clearRefCache', () => {
    it('should clear the ref cache', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ object: { sha: 'abc123', type: 'commit' } }),
      })

      await resolveRefToSha('owner', 'repo', 'v1.0.0', {
        cachePath: tempDir,
      })
      expect(getRefCacheSize()).toBeGreaterThan(0)

      clearRefCache()
      expect(getRefCacheSize()).toBe(0)
    })
  })

  describe('getRefCacheSize', () => {
    it('should return 0 for empty cache', () => {
      expect(getRefCacheSize()).toBe(0)
    })

    it('should return cache size after adding entries', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ object: { sha: 'abc123', type: 'commit' } }),
      })

      await resolveRefToSha('owner', 'repo', 'v1.0.0', {
        cachePath: tempDir,
      })
      expect(getRefCacheSize()).toBe(1)

      await resolveRefToSha('owner', 'repo', 'v2.0.0', {
        cachePath: tempDir,
      })
      expect(getRefCacheSize()).toBe(2)
    })
  })

  describe('resolveRefToSha', () => {
    it('should resolve a tag to SHA', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          object: { sha: 'abc123', type: 'commit', url: 'test' },
          ref: 'refs/tags/v1.0.0',
          url: 'test',
        }),
      })

      const sha = await resolveRefToSha('owner', 'repo', 'v1.0.0', {
        cachePath: tempDir,
      })
      expect(sha).toBe('abc123')
    })

    it('should resolve an annotated tag to SHA', async () => {
      let callCount = 0
      global.fetch = vi.fn().mockImplementation(async () => {
        callCount += 1
        if (callCount === 1) {
          return {
            ok: true,
            json: async () => ({
              object: {
                sha: 'tag-sha',
                type: 'tag',
                url: 'https://api.github.com/repos/owner/repo/git/tags/tag-sha',
              },
              ref: 'refs/tags/v1.0.0',
              url: 'test',
            }),
          }
        }
        return {
          ok: true,
          json: async () => ({
            object: { sha: 'commit-sha', type: 'commit' },
            sha: 'tag-sha',
            tag: 'v1.0.0',
            message: 'Release v1.0.0',
          }),
        }
      })

      const sha = await resolveRefToSha('owner', 'repo', 'v1.0.0', {
        cachePath: tempDir,
      })
      expect(sha).toBe('commit-sha')
    })

    it('should resolve a branch to SHA', async () => {
      let callCount = 0
      global.fetch = vi.fn().mockImplementation(async () => {
        callCount += 1
        if (callCount === 1) {
          return { ok: false, status: 404 }
        }
        return {
          ok: true,
          json: async () => ({
            object: { sha: 'branch-sha', type: 'commit' },
            ref: 'refs/heads/main',
            url: 'test',
          }),
        }
      })

      const sha = await resolveRefToSha('owner', 'repo', 'main', {
        cachePath: tempDir,
      })
      expect(sha).toBe('branch-sha')
    })

    it('should resolve a commit SHA directly', async () => {
      let callCount = 0
      global.fetch = vi.fn().mockImplementation(async () => {
        callCount += 1
        if (callCount <= 2) {
          return { ok: false, status: 404 }
        }
        return {
          ok: true,
          json: async () => ({
            sha: 'commit-sha',
            url: 'test',
            commit: {
              message: 'test',
              author: { name: 'test', email: 'test', date: 'test' },
            },
          }),
        }
      })

      const sha = await resolveRefToSha('owner', 'repo', 'commit-sha', {
        cachePath: tempDir,
      })
      expect(sha).toBe('commit-sha')
    })

    it('should throw error for invalid ref', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      })

      await expect(
        resolveRefToSha('owner', 'repo', 'invalid-ref', {
          cachePath: tempDir,
        }),
      ).rejects.toThrow(/failed to resolve ref/)
    })

    it('should use in-memory cache for repeated calls', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          object: { sha: 'cached-sha', type: 'commit' },
        }),
      })

      const sha1 = await resolveRefToSha('owner', 'repo', 'v1.0.0', {
        cachePath: tempDir,
      })
      const sha2 = await resolveRefToSha('owner', 'repo', 'v1.0.0', {
        cachePath: tempDir,
      })

      expect(sha1).toBe('cached-sha')
      expect(sha2).toBe('cached-sha')
      expect(global.fetch).toHaveBeenCalledTimes(1)
    })

    it('should skip cache when cache option is false', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          object: { sha: 'no-cache-sha', type: 'commit' },
        }),
      })

      const sha1 = await resolveRefToSha('owner', 'repo', 'v1.0.0', {
        cache: false,
        cachePath: tempDir,
      })
      const sha2 = await resolveRefToSha('owner', 'repo', 'v1.0.0', {
        cache: false,
        cachePath: tempDir,
      })

      expect(sha1).toBe('no-cache-sha')
      expect(sha2).toBe('no-cache-sha')
      expect(global.fetch).toHaveBeenCalledTimes(2)
    })

    it('should skip disk cache when DISABLE_GITHUB_CACHE is set', async () => {
      process.env['DISABLE_GITHUB_CACHE'] = '1'
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          object: { sha: 'no-disk-cache-sha', type: 'commit' },
        }),
      })

      const sha = await resolveRefToSha('owner', 'repo', 'v1.0.0', {
        cachePath: tempDir,
      })
      expect(sha).toBe('no-disk-cache-sha')
    })

    it('should use custom TTL option', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          object: { sha: 'ttl-sha', type: 'commit' },
        }),
      })

      const sha = await resolveRefToSha('owner', 'repo', 'v1.0.0', {
        cachePath: tempDir,
        ttl: 10_000,
      })
      expect(sha).toBe('ttl-sha')
    })

    it('should use provided token for authentication', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          object: { sha: 'auth-sha', type: 'commit' },
        }),
      })

      await resolveRefToSha('owner', 'repo', 'v1.0.0', {
        token: 'custom-token',
        cachePath: tempDir,
      })

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('api.github.com'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer custom-token',
          }),
        }),
      )
    })
  })
})
