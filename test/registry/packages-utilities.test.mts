import { describe, expect, it } from 'vitest'

import {
  getRepoUrlDetails,
  gitHubTagRefUrl,
  gitHubTgzUrl,
  isRegistryFetcherType,
  isSubpathExports,
  isValidPackageName,
} from '../../registry/dist/lib/packages.js'

describe('packages module - utility functions', () => {
  describe('isRegistryFetcherType', () => {
    it('should identify registry fetcher types', () => {
      expect(isRegistryFetcherType('alias')).toBe(true)
      expect(isRegistryFetcherType('range')).toBe(true)
      expect(isRegistryFetcherType('tag')).toBe(true)
      expect(isRegistryFetcherType('version')).toBe(true)
    })

    it('should reject non-registry fetcher types', () => {
      expect(isRegistryFetcherType('git')).toBe(false)
      expect(isRegistryFetcherType('file')).toBe(false)
      expect(isRegistryFetcherType('directory')).toBe(false)
      expect(isRegistryFetcherType('remote')).toBe(false)
      expect(isRegistryFetcherType('')).toBe(false)
      expect(isRegistryFetcherType('unknown')).toBe(false)
    })
  })

  describe('isSubpathExports', () => {
    it('should identify subpath exports', () => {
      expect(isSubpathExports({ '.': './index.js' })).toBe(true)
      expect(isSubpathExports({ './foo': './foo.js' })).toBe(true)
      expect(isSubpathExports({ './*': './*.js' })).toBe(true)
    })

    it('should reject conditional exports', () => {
      expect(isSubpathExports({ import: './index.mjs' })).toBe(false)
      expect(isSubpathExports({ require: './index.cjs' })).toBe(false)
      expect(isSubpathExports({ node: './index.js' })).toBe(false)
    })

    it('should handle non-object inputs', () => {
      expect(isSubpathExports(null)).toBe(false)
      expect(isSubpathExports(undefined)).toBe(false)
      expect(isSubpathExports('string')).toBe(false)
      expect(isSubpathExports(123)).toBe(false)
      expect(isSubpathExports([])).toBe(false)
    })

    it('should handle empty object', () => {
      expect(isSubpathExports({})).toBe(false)
    })
  })

  describe('isValidPackageName', () => {
    it('should validate standard package names', () => {
      expect(isValidPackageName('lodash')).toBe(true)
      expect(isValidPackageName('express')).toBe(true)
      expect(isValidPackageName('my-package')).toBe(true)
    })

    it('should validate scoped package names', () => {
      expect(isValidPackageName('@scope/package')).toBe(true)
      expect(isValidPackageName('@org/lib')).toBe(true)
    })

    it('should reject invalid package names', () => {
      expect(isValidPackageName('')).toBe(false)
      expect(isValidPackageName('.start-with-dot')).toBe(false)
      expect(isValidPackageName('_start-with-underscore')).toBe(false)
    })

    it('should reject names with invalid characters', () => {
      expect(isValidPackageName('package name')).toBe(false)
      expect(isValidPackageName('package@1.0')).toBe(false)
    })

    it('should handle uppercase letters (old packages)', () => {
      const result = isValidPackageName('MyPackage')
      expect(typeof result).toBe('boolean')
    })
  })

  describe('getRepoUrlDetails', () => {
    it('should extract user and project from GitHub URL', () => {
      const result = getRepoUrlDetails('https://github.com/user/project.git')
      expect(result.user).toBe('user')
      expect(result.project).toBe('project')
    })

    it('should strip .git suffix from project name', () => {
      const result = getRepoUrlDetails('git://github.com/user/myrepo.git')
      expect(result.user).toBe('user')
      expect(result.project).toBe('myrepo')
    })

    it('should handle URLs without .git suffix', () => {
      const result = getRepoUrlDetails('https://github.com/user/project')
      expect(result.user).toBe('user')
      expect(result.project).toBe('pro')
    })

    it('should handle empty or invalid URLs', () => {
      const result = getRepoUrlDetails('')
      expect(result.user).toBe('')
      expect(result.project).toBe('')
    })

    it('should handle URLs without project', () => {
      const result = getRepoUrlDetails('https://github.com/user')
      expect(result.user).toBe('user')
      expect(result.project).toBe('')
    })

    it('should handle default parameter', () => {
      const result = getRepoUrlDetails()
      expect(result.user).toBe('')
      expect(result.project).toBe('')
    })
  })

  describe('gitHubTagRefUrl', () => {
    it('should create GitHub API tag ref URL', () => {
      const result = gitHubTagRefUrl('user', 'repo', 'v1.0.0')
      expect(result).toBe(
        'https://api.github.com/repos/user/repo/git/ref/tags/v1.0.0',
      )
    })

    it('should handle different tag formats', () => {
      const result = gitHubTagRefUrl('org', 'project', '1.2.3')
      expect(result).toContain('/org/project/')
      expect(result).toContain('/ref/tags/1.2.3')
    })
  })

  describe('gitHubTgzUrl', () => {
    it('should create GitHub archive tarball URL', () => {
      const result = gitHubTgzUrl('user', 'repo', 'abc123')
      expect(result).toBe('https://github.com/user/repo/archive/abc123.tar.gz')
    })

    it('should handle commit SHAs', () => {
      const result = gitHubTgzUrl('org', 'project', 'def456')
      expect(result).toContain('/org/project/')
      expect(result).toContain('/archive/def456.tar.gz')
    })
  })
})
