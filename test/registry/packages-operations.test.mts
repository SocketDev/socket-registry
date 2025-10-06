import path from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  isGitHubTgzSpec,
  isGitHubUrlSpec,
  readPackageJsonSync,
  resolveEscapedScope,
  resolvePackageJsonDirname,
  resolvePackageName,
  resolveRegistryPackageName,
  unescapeScope,
} from '../../registry/dist/lib/packages.js'

describe('packages module - operations and utilities', () => {
  describe('readPackageJsonSync', () => {
    it('should read package.json from project root', () => {
      const pkgPath = path.join(process.cwd(), 'package.json')
      const result = readPackageJsonSync(pkgPath)
      expect(result).toBeDefined()
      expect(result!.name).toBeDefined()
    })

    it('should handle non-existent file', () => {
      expect(() => readPackageJsonSync('/nonexistent/package.json')).toThrow()
    })

    it('should handle directory path', () => {
      const result = readPackageJsonSync(process.cwd())
      expect(result).toBeDefined()
    })
  })

  describe('resolvePackageName', () => {
    it('should resolve unscoped package name', () => {
      const result = resolvePackageName('lodash')
      expect(typeof result).toBe('string')
    })

    it('should resolve scoped package name', () => {
      const result = resolvePackageName('@types/node')
      expect(typeof result).toBe('string')
    })

    it('should handle package with version', () => {
      const result = resolvePackageName('lodash@4.17.21')
      expect(typeof result).toBe('string')
    })

    it('should handle empty string', () => {
      const result = resolvePackageName('')
      expect(typeof result).toBe('string')
    })
  })

  describe('resolveRegistryPackageName', () => {
    it('should resolve unscoped package to registry name', () => {
      const result = resolveRegistryPackageName('lodash')
      expect(result).toBe('lodash')
    })

    it('should resolve scoped package to registry name', () => {
      const result = resolveRegistryPackageName('@types/node')
      expect(result).toBe('types__node')
    })

    it('should handle already-registry-scoped packages', () => {
      const result = resolveRegistryPackageName('@socketregistry/lodash')
      expect(result).toBe('socketregistry__lodash')
    })
  })

  describe('resolveEscapedScope', () => {
    it('should detect escaped scope in package name', () => {
      const result = resolveEscapedScope('types__node')
      expect(result).toBe('types__')
    })

    it('should return undefined for unscoped packages', () => {
      const result = resolveEscapedScope('lodash')
      expect(result).toBe(undefined)
    })

    it('should handle packages with underscores but not escaped scopes', () => {
      const result = resolveEscapedScope('my_package')
      expect(result).toBe(undefined)
    })

    it('should handle empty string', () => {
      const result = resolveEscapedScope('')
      expect(result).toBe(undefined)
    })
  })

  describe('unescapeScope', () => {
    it('should unescape scope with delimiter', () => {
      const result = unescapeScope('types__')
      expect(result).toBe('@types')
    })

    it('should handle scope with multiple parts', () => {
      const result = unescapeScope('babel__core__')
      expect(result).toBe('@babel__core')
    })
  })

  describe('resolvePackageJsonDirname', () => {
    it('should extract dirname from package.json path', () => {
      const result = resolvePackageJsonDirname('/some/path/package.json')
      expect(result).toBe('/some/path')
    })

    it('should return path unchanged if not package.json', () => {
      const result = resolvePackageJsonDirname('/some/path')
      expect(result).toBe('/some/path')
    })

    it('should handle nested paths', () => {
      const result = resolvePackageJsonDirname('/a/b/c/package.json')
      expect(result).toBe('/a/b/c')
    })

    it('should handle root package.json', () => {
      const result = resolvePackageJsonDirname('/package.json')
      expect(result).toBe('/')
    })
  })

  describe('isGitHubTgzSpec', () => {
    it('should identify GitHub archive URLs', () => {
      expect(
        isGitHubTgzSpec('https://github.com/user/repo/archive/master.tar.gz'),
      ).toBe(true)
    })

    it('should reject non-tarball URLs', () => {
      expect(isGitHubTgzSpec('https://github.com/user/repo')).toBe(false)
    })

    it('should reject regular npm packages', () => {
      expect(isGitHubTgzSpec('lodash')).toBe(false)
    })

    it('should handle empty string', () => {
      expect(isGitHubTgzSpec('')).toBe(false)
    })
  })

  describe('isGitHubUrlSpec', () => {
    it('should identify GitHub URLs with committish', () => {
      expect(isGitHubUrlSpec('github:user/repo#v1.0.0')).toBe(true)
      expect(isGitHubUrlSpec('user/repo#master')).toBe(true)
    })

    it('should reject GitHub URLs without committish', () => {
      expect(isGitHubUrlSpec('github:user/repo')).toBe(false)
      expect(isGitHubUrlSpec('user/repo')).toBe(false)
    })

    it('should reject non-GitHub URLs', () => {
      expect(isGitHubUrlSpec('https://gitlab.com/user/repo')).toBe(false)
      expect(isGitHubUrlSpec('https://example.com')).toBe(false)
    })

    it('should handle npm package names', () => {
      expect(isGitHubUrlSpec('lodash')).toBe(false)
      expect(isGitHubUrlSpec('@types/node')).toBe(false)
    })

    it('should handle empty string', () => {
      expect(isGitHubUrlSpec('')).toBe(false)
    })
  })
})
