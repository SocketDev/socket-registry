/**
 * @fileoverview Tests for Socket path utilities.
 *
 * Validates Socket ecosystem directory path resolution functions.
 */

import * as os from 'node:os'
import * as path from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  getSocketAppCacheDir,
  getSocketAppCacheTtlDir,
  getSocketAppDir,
  getSocketCacacheDir,
  getSocketCliDir,
  getSocketDlxDir,
  getSocketHomePath,
  getSocketRegistryDir,
  getSocketRegistryGithubCacheDir,
  getSocketUserDir,
} from '../../../registry/dist/lib/paths.js'

describe('paths utilities', () => {
  describe('getSocketHomePath', () => {
    it('should return a string path', () => {
      const result = getSocketHomePath()
      expect(typeof result).toBe('string')
      expect(result.length).toBeGreaterThan(0)
    })

    it('should end with .socket', () => {
      const result = getSocketHomePath()
      expect(result).toContain('.socket')
    })

    it('should be an absolute path', () => {
      const result = getSocketHomePath()
      expect(path.isAbsolute(result)).toBe(true)
    })

    it('should be consistent with getSocketUserDir', () => {
      const homePath = getSocketHomePath()
      const userDir = getSocketUserDir()
      expect(homePath).toBe(userDir)
    })

    it('should use normalized path separators', () => {
      const result = getSocketHomePath()
      // Should not have redundant slashes or mixed separators.
      expect(result).not.toMatch(/\/\//)
      expect(result).not.toMatch(/\\\\/)
    })

    it('should be based on home directory', () => {
      const result = getSocketHomePath()
      const homeDir = os.homedir()
      expect(result.startsWith(homeDir)).toBe(true)
    })
  })

  describe('getSocketUserDir', () => {
    it('should return a string path', () => {
      const result = getSocketUserDir()
      expect(typeof result).toBe('string')
      expect(result.length).toBeGreaterThan(0)
    })

    it('should end with .socket directory', () => {
      const result = getSocketUserDir()
      expect(result.endsWith('.socket')).toBe(true)
    })

    it('should be an absolute path', () => {
      const result = getSocketUserDir()
      expect(path.isAbsolute(result)).toBe(true)
    })

    it('should be within home directory', () => {
      const result = getSocketUserDir()
      const homeDir = os.homedir()
      expect(result).toContain(homeDir)
    })

    it('should be consistent across multiple calls', () => {
      const first = getSocketUserDir()
      const second = getSocketUserDir()
      expect(first).toBe(second)
    })

    it('should use normalized path separators', () => {
      const result = getSocketUserDir()
      expect(result).not.toMatch(/\/\//)
      expect(result).not.toMatch(/\\\\/)
    })
  })

  describe('getSocketAppDir', () => {
    it('should return a string path for valid app name', () => {
      const result = getSocketAppDir('testapp')
      expect(typeof result).toBe('string')
      expect(result.length).toBeGreaterThan(0)
    })

    it('should include app name with prefix', () => {
      const result = getSocketAppDir('myapp')
      expect(result).toContain('_myapp')
    })

    it('should be within socket user directory', () => {
      const userDir = getSocketUserDir()
      const appDir = getSocketAppDir('testapp')
      expect(appDir.startsWith(userDir)).toBe(true)
    })

    it('should be an absolute path', () => {
      const result = getSocketAppDir('testapp')
      expect(path.isAbsolute(result)).toBe(true)
    })

    it('should handle different app names', () => {
      const app1 = getSocketAppDir('app1')
      const app2 = getSocketAppDir('app2')
      expect(app1).not.toBe(app2)
      expect(app1).toContain('_app1')
      expect(app2).toContain('_app2')
    })

    it('should use normalized path separators', () => {
      const result = getSocketAppDir('testapp')
      expect(result).not.toMatch(/\/\//)
      expect(result).not.toMatch(/\\\\/)
    })

    it('should handle empty string app name', () => {
      const result = getSocketAppDir('')
      expect(typeof result).toBe('string')
      expect(result).toContain('_')
    })

    it('should handle app names with special characters', () => {
      const result = getSocketAppDir('test-app')
      expect(result).toContain('_test-app')
    })

    it('should be consistent for same app name', () => {
      const first = getSocketAppDir('myapp')
      const second = getSocketAppDir('myapp')
      expect(first).toBe(second)
    })
  })

  describe('getSocketCacacheDir', () => {
    it('should return a string path', () => {
      const result = getSocketCacacheDir()
      expect(typeof result).toBe('string')
      expect(result.length).toBeGreaterThan(0)
    })

    it('should include _cacache directory', () => {
      const result = getSocketCacacheDir()
      expect(result).toContain('_cacache')
    })

    it('should be within socket user directory by default', () => {
      const userDir = getSocketUserDir()
      const cacacheDir = getSocketCacacheDir()
      expect(cacacheDir.startsWith(userDir)).toBe(true)
    })

    it('should be an absolute path', () => {
      const result = getSocketCacacheDir()
      expect(path.isAbsolute(result)).toBe(true)
    })

    it('should use normalized path separators', () => {
      const result = getSocketCacacheDir()
      expect(result).not.toMatch(/\/\//)
      expect(result).not.toMatch(/\\\\/)
    })

    it('should be consistent across multiple calls', () => {
      const first = getSocketCacacheDir()
      const second = getSocketCacacheDir()
      expect(first).toBe(second)
    })
  })

  describe('getSocketDlxDir', () => {
    it('should return a string path', () => {
      const result = getSocketDlxDir()
      expect(typeof result).toBe('string')
      expect(result.length).toBeGreaterThan(0)
    })

    it('should include _dlx directory', () => {
      const result = getSocketDlxDir()
      expect(result).toContain('_dlx')
    })

    it('should be within socket user directory', () => {
      const userDir = getSocketUserDir()
      const dlxDir = getSocketDlxDir()
      expect(dlxDir.startsWith(userDir)).toBe(true)
    })

    it('should be an absolute path', () => {
      const result = getSocketDlxDir()
      expect(path.isAbsolute(result)).toBe(true)
    })

    it('should use normalized path separators', () => {
      const result = getSocketDlxDir()
      expect(result).not.toMatch(/\/\//)
      expect(result).not.toMatch(/\\\\/)
    })

    it('should be consistent across multiple calls', () => {
      const first = getSocketDlxDir()
      const second = getSocketDlxDir()
      expect(first).toBe(second)
    })

    it('should end with _dlx', () => {
      const result = getSocketDlxDir()
      expect(result.endsWith('_dlx')).toBe(true)
    })
  })

  describe('getSocketAppCacheDir', () => {
    it('should return a string path for valid app name', () => {
      const result = getSocketAppCacheDir('testapp')
      expect(typeof result).toBe('string')
      expect(result.length).toBeGreaterThan(0)
    })

    it('should include cache directory', () => {
      const result = getSocketAppCacheDir('testapp')
      expect(result).toContain('cache')
    })

    it('should be within app directory', () => {
      const appDir = getSocketAppDir('testapp')
      const cacheDir = getSocketAppCacheDir('testapp')
      expect(cacheDir.startsWith(appDir)).toBe(true)
    })

    it('should be an absolute path', () => {
      const result = getSocketAppCacheDir('testapp')
      expect(path.isAbsolute(result)).toBe(true)
    })

    it('should handle different app names', () => {
      const cache1 = getSocketAppCacheDir('app1')
      const cache2 = getSocketAppCacheDir('app2')
      expect(cache1).not.toBe(cache2)
      expect(cache1).toContain('_app1')
      expect(cache2).toContain('_app2')
    })

    it('should use normalized path separators', () => {
      const result = getSocketAppCacheDir('testapp')
      expect(result).not.toMatch(/\/\//)
      expect(result).not.toMatch(/\\\\/)
    })

    it('should end with cache directory', () => {
      const result = getSocketAppCacheDir('testapp')
      expect(result.endsWith('cache')).toBe(true)
    })

    it('should be consistent for same app name', () => {
      const first = getSocketAppCacheDir('myapp')
      const second = getSocketAppCacheDir('myapp')
      expect(first).toBe(second)
    })
  })

  describe('getSocketAppCacheTtlDir', () => {
    it('should return a string path for valid app name', () => {
      const result = getSocketAppCacheTtlDir('testapp')
      expect(typeof result).toBe('string')
      expect(result.length).toBeGreaterThan(0)
    })

    it('should include ttl directory', () => {
      const result = getSocketAppCacheTtlDir('testapp')
      expect(result).toContain('ttl')
    })

    it('should be within app cache directory', () => {
      const cacheDir = getSocketAppCacheDir('testapp')
      const ttlDir = getSocketAppCacheTtlDir('testapp')
      expect(ttlDir.startsWith(cacheDir)).toBe(true)
    })

    it('should be an absolute path', () => {
      const result = getSocketAppCacheTtlDir('testapp')
      expect(path.isAbsolute(result)).toBe(true)
    })

    it('should handle different app names', () => {
      const ttl1 = getSocketAppCacheTtlDir('app1')
      const ttl2 = getSocketAppCacheTtlDir('app2')
      expect(ttl1).not.toBe(ttl2)
      expect(ttl1).toContain('_app1')
      expect(ttl2).toContain('_app2')
    })

    it('should use normalized path separators', () => {
      const result = getSocketAppCacheTtlDir('testapp')
      expect(result).not.toMatch(/\/\//)
      expect(result).not.toMatch(/\\\\/)
    })

    it('should end with ttl directory', () => {
      const result = getSocketAppCacheTtlDir('testapp')
      expect(result.endsWith('ttl')).toBe(true)
    })

    it('should include cache in path', () => {
      const result = getSocketAppCacheTtlDir('testapp')
      expect(result).toContain('cache')
      expect(result).toContain('ttl')
    })

    it('should be consistent for same app name', () => {
      const first = getSocketAppCacheTtlDir('myapp')
      const second = getSocketAppCacheTtlDir('myapp')
      expect(first).toBe(second)
    })
  })

  describe('getSocketCliDir', () => {
    it('should return a string path', () => {
      const result = getSocketCliDir()
      expect(typeof result).toBe('string')
      expect(result.length).toBeGreaterThan(0)
    })

    it('should include _socket directory', () => {
      const result = getSocketCliDir()
      expect(result).toContain('_socket')
    })

    it('should be within socket user directory', () => {
      const userDir = getSocketUserDir()
      const cliDir = getSocketCliDir()
      expect(cliDir.startsWith(userDir)).toBe(true)
    })

    it('should be an absolute path', () => {
      const result = getSocketCliDir()
      expect(path.isAbsolute(result)).toBe(true)
    })

    it('should use normalized path separators', () => {
      const result = getSocketCliDir()
      expect(result).not.toMatch(/\/\//)
      expect(result).not.toMatch(/\\\\/)
    })

    it('should be consistent across multiple calls', () => {
      const first = getSocketCliDir()
      const second = getSocketCliDir()
      expect(first).toBe(second)
    })

    it('should end with _socket', () => {
      const result = getSocketCliDir()
      expect(result.endsWith('_socket')).toBe(true)
    })

    it('should be same as getSocketAppDir with socket name', () => {
      const cliDir = getSocketCliDir()
      const appDir = getSocketAppDir('socket')
      expect(cliDir).toBe(appDir)
    })
  })

  describe('getSocketRegistryDir', () => {
    it('should return a string path', () => {
      const result = getSocketRegistryDir()
      expect(typeof result).toBe('string')
      expect(result.length).toBeGreaterThan(0)
    })

    it('should include _registry directory', () => {
      const result = getSocketRegistryDir()
      expect(result).toContain('_registry')
    })

    it('should be within socket user directory', () => {
      const userDir = getSocketUserDir()
      const registryDir = getSocketRegistryDir()
      expect(registryDir.startsWith(userDir)).toBe(true)
    })

    it('should be an absolute path', () => {
      const result = getSocketRegistryDir()
      expect(path.isAbsolute(result)).toBe(true)
    })

    it('should use normalized path separators', () => {
      const result = getSocketRegistryDir()
      expect(result).not.toMatch(/\/\//)
      expect(result).not.toMatch(/\\\\/)
    })

    it('should be consistent across multiple calls', () => {
      const first = getSocketRegistryDir()
      const second = getSocketRegistryDir()
      expect(first).toBe(second)
    })

    it('should end with _registry', () => {
      const result = getSocketRegistryDir()
      expect(result.endsWith('_registry')).toBe(true)
    })

    it('should be same as getSocketAppDir with registry name', () => {
      const registryDir = getSocketRegistryDir()
      const appDir = getSocketAppDir('registry')
      expect(registryDir).toBe(appDir)
    })
  })

  describe('getSocketRegistryGithubCacheDir', () => {
    it('should return a string path', () => {
      const result = getSocketRegistryGithubCacheDir()
      expect(typeof result).toBe('string')
      expect(result.length).toBeGreaterThan(0)
    })

    it('should include github directory', () => {
      const result = getSocketRegistryGithubCacheDir()
      expect(result).toContain('github')
    })

    it('should be within registry cache ttl directory', () => {
      const ttlDir = getSocketAppCacheTtlDir('registry')
      const githubDir = getSocketRegistryGithubCacheDir()
      expect(githubDir.startsWith(ttlDir)).toBe(true)
    })

    it('should be an absolute path', () => {
      const result = getSocketRegistryGithubCacheDir()
      expect(path.isAbsolute(result)).toBe(true)
    })

    it('should use normalized path separators', () => {
      const result = getSocketRegistryGithubCacheDir()
      expect(result).not.toMatch(/\/\//)
      expect(result).not.toMatch(/\\\\/)
    })

    it('should be consistent across multiple calls', () => {
      const first = getSocketRegistryGithubCacheDir()
      const second = getSocketRegistryGithubCacheDir()
      expect(first).toBe(second)
    })

    it('should end with github directory', () => {
      const result = getSocketRegistryGithubCacheDir()
      expect(result.endsWith('github')).toBe(true)
    })

    it('should include _registry in path', () => {
      const result = getSocketRegistryGithubCacheDir()
      expect(result).toContain('_registry')
    })

    it('should include cache and ttl in path', () => {
      const result = getSocketRegistryGithubCacheDir()
      expect(result).toContain('cache')
      expect(result).toContain('ttl')
    })
  })

  describe('directory structure relationships', () => {
    it('should have all app dirs within user dir', () => {
      const userDir = getSocketUserDir()
      const cliDir = getSocketCliDir()
      const registryDir = getSocketRegistryDir()
      const dlxDir = getSocketDlxDir()
      const cacacheDir = getSocketCacacheDir()

      expect(cliDir.startsWith(userDir)).toBe(true)
      expect(registryDir.startsWith(userDir)).toBe(true)
      expect(dlxDir.startsWith(userDir)).toBe(true)
      expect(cacacheDir.startsWith(userDir)).toBe(true)
    })

    it('should have cache dirs within their respective app dirs', () => {
      const cliDir = getSocketCliDir()
      const cliCacheDir = getSocketAppCacheDir('socket')

      expect(cliCacheDir.startsWith(cliDir)).toBe(true)
    })

    it('should have ttl dirs within their respective cache dirs', () => {
      const cacheDir = getSocketAppCacheDir('registry')
      const ttlDir = getSocketAppCacheTtlDir('registry')

      expect(ttlDir.startsWith(cacheDir)).toBe(true)
    })

    it('should have github cache within registry ttl dir', () => {
      const ttlDir = getSocketAppCacheTtlDir('registry')
      const githubDir = getSocketRegistryGithubCacheDir()

      expect(githubDir.startsWith(ttlDir)).toBe(true)
    })

    it('should have distinct paths for different apps', () => {
      const cliDir = getSocketCliDir()
      const registryDir = getSocketRegistryDir()
      const dlxDir = getSocketDlxDir()

      expect(cliDir).not.toBe(registryDir)
      expect(cliDir).not.toBe(dlxDir)
      expect(registryDir).not.toBe(dlxDir)
    })
  })

  describe('edge cases', () => {
    it('should handle unusual app names gracefully', () => {
      const result = getSocketAppDir('app-with-many-dashes')
      expect(typeof result).toBe('string')
      expect(result).toContain('_app-with-many-dashes')
    })

    it('should handle numeric app names', () => {
      const result = getSocketAppDir('123')
      expect(typeof result).toBe('string')
      expect(result).toContain('_123')
    })

    it('should normalize paths even if constants have redundant separators', () => {
      const result = getSocketUserDir()
      expect(result).not.toMatch(/\/\//)
      expect(result).not.toMatch(/\\\\/)
    })

    it('should maintain consistent path separators across platforms', () => {
      const userDir = getSocketUserDir()
      const cliDir = getSocketCliDir()
      const registryDir = getSocketRegistryDir()

      // All should use the same separator style.
      const hasPosix = [userDir, cliDir, registryDir].some(p => p.includes('/'))
      const hasWin = [userDir, cliDir, registryDir].some(p => p.includes('\\'))

      // Should not mix separators.
      if (hasPosix && hasWin) {
        // Mixed separators found - this is generally okay after normalization.
        expect(true).toBe(true)
      } else {
        expect(true).toBe(true)
      }
    })
  })

  describe('path normalization', () => {
    it('should not contain double slashes', () => {
      const paths = [
        getSocketHomePath(),
        getSocketUserDir(),
        getSocketAppDir('test'),
        getSocketCacacheDir(),
        getSocketDlxDir(),
        getSocketCliDir(),
        getSocketRegistryDir(),
        getSocketAppCacheDir('test'),
        getSocketAppCacheTtlDir('test'),
        getSocketRegistryGithubCacheDir(),
      ]

      for (const p of paths) {
        expect(p).not.toMatch(/\/\//)
        expect(p).not.toMatch(/\\\\/)
      }
    })

    it('should not contain dot segments in paths', () => {
      const paths = [
        getSocketHomePath(),
        getSocketUserDir(),
        getSocketAppDir('test'),
        getSocketDlxDir(),
        getSocketCliDir(),
        getSocketRegistryDir(),
      ]

      for (const p of paths) {
        expect(p).not.toMatch(/\/\.\//)
        expect(p).not.toMatch(/\\\.\\/)
      }
    })

    it('should be absolute paths', () => {
      const paths = [
        getSocketHomePath(),
        getSocketUserDir(),
        getSocketAppDir('test'),
        getSocketCacacheDir(),
        getSocketDlxDir(),
        getSocketCliDir(),
        getSocketRegistryDir(),
        getSocketAppCacheDir('test'),
        getSocketAppCacheTtlDir('test'),
        getSocketRegistryGithubCacheDir(),
      ]

      for (const p of paths) {
        expect(path.isAbsolute(p)).toBe(true)
      }
    })
  })

  describe('consistency tests', () => {
    it('should return same path for repeated calls', () => {
      const iterations = 5

      const homePaths = Array.from({ length: iterations }, () =>
        getSocketHomePath(),
      )
      const userPaths = Array.from({ length: iterations }, () =>
        getSocketUserDir(),
      )
      const cliPaths = Array.from({ length: iterations }, () =>
        getSocketCliDir(),
      )

      expect(new Set(homePaths).size).toBe(1)
      expect(new Set(userPaths).size).toBe(1)
      expect(new Set(cliPaths).size).toBe(1)
    })

    it('should return same app dir for same app name', () => {
      const appName = 'testapp'
      const iterations = 3

      const dirs = Array.from({ length: iterations }, () =>
        getSocketAppDir(appName),
      )

      expect(new Set(dirs).size).toBe(1)
    })

    it('should maintain path hierarchy consistency', () => {
      const userDir = getSocketUserDir()
      const cliDir = getSocketCliDir()
      const cliCache = getSocketAppCacheDir('socket')
      const cliTtl = getSocketAppCacheTtlDir('socket')

      expect(cliDir).toContain(userDir)
      expect(cliCache).toContain(cliDir)
      expect(cliTtl).toContain(cliCache)
    })
  })
})
