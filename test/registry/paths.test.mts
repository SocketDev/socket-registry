import os from 'node:os'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import type {
  getSocketAppCacheDir,
  getSocketAppCacheTtlDir,
  getSocketAppDir,
  getSocketCacacheDir,
  getSocketCliDir,
  getSocketDlxDir,
  getSocketRegistryDir,
  getSocketRegistryGithubCacheDir,
  getSocketUserDir,
} from '../../registry/dist/lib/paths'

describe('paths module', () => {
  const paths = require('../../registry/dist/lib/paths') as {
    getSocketAppCacheDir: typeof getSocketAppCacheDir
    getSocketAppCacheTtlDir: typeof getSocketAppCacheTtlDir
    getSocketAppDir: typeof getSocketAppDir
    getSocketCacacheDir: typeof getSocketCacacheDir
    getSocketCliDir: typeof getSocketCliDir
    getSocketDlxDir: typeof getSocketDlxDir
    getSocketRegistryDir: typeof getSocketRegistryDir
    getSocketRegistryGithubCacheDir: typeof getSocketRegistryGithubCacheDir
    getSocketUserDir: typeof getSocketUserDir
  }

  describe('getSocketUserDir', () => {
    it('should return ~/.socket path', () => {
      const result = paths.getSocketUserDir()
      expect(result).toBe(path.join(os.homedir(), '.socket'))
    })

    it('should return consistent path on multiple calls', () => {
      const first = paths.getSocketUserDir()
      const second = paths.getSocketUserDir()
      expect(first).toBe(second)
    })
  })

  describe('getSocketAppDir', () => {
    it('should return app directory with underscore prefix', () => {
      const result = paths.getSocketAppDir('test')
      expect(result).toBe(path.join(os.homedir(), '.socket', '_test'))
    })

    it('should handle different app names', () => {
      const socket = paths.getSocketAppDir('socket')
      const registry = paths.getSocketAppDir('registry')
      expect(socket).toBe(path.join(os.homedir(), '.socket', '_socket'))
      expect(registry).toBe(path.join(os.homedir(), '.socket', '_registry'))
    })
  })

  describe('getSocketCacacheDir', () => {
    it('should return cacache directory', () => {
      const result = paths.getSocketCacacheDir()
      expect(result).toBe(path.join(os.homedir(), '.socket', '_cacache'))
    })
  })

  describe('getSocketDlxDir', () => {
    it('should return dlx directory', () => {
      const result = paths.getSocketDlxDir()
      expect(result).toBe(path.join(os.homedir(), '.socket', '_dlx'))
    })
  })

  describe('getSocketAppCacheDir', () => {
    it('should return app cache directory', () => {
      const result = paths.getSocketAppCacheDir('test')
      expect(result).toBe(path.join(os.homedir(), '.socket', '_test', 'cache'))
    })

    it('should handle different app names', () => {
      const socketCache = paths.getSocketAppCacheDir('socket')
      const registryCache = paths.getSocketAppCacheDir('registry')
      expect(socketCache).toBe(
        path.join(os.homedir(), '.socket', '_socket', 'cache'),
      )
      expect(registryCache).toBe(
        path.join(os.homedir(), '.socket', '_registry', 'cache'),
      )
    })
  })

  describe('getSocketAppCacheTtlDir', () => {
    it('should return app TTL cache directory', () => {
      const result = paths.getSocketAppCacheTtlDir('test')
      expect(result).toBe(
        path.join(os.homedir(), '.socket', '_test', 'cache', 'ttl'),
      )
    })

    it('should handle different app names', () => {
      const socketTtl = paths.getSocketAppCacheTtlDir('socket')
      const registryTtl = paths.getSocketAppCacheTtlDir('registry')
      expect(socketTtl).toBe(
        path.join(os.homedir(), '.socket', '_socket', 'cache', 'ttl'),
      )
      expect(registryTtl).toBe(
        path.join(os.homedir(), '.socket', '_registry', 'cache', 'ttl'),
      )
    })
  })

  describe('getSocketCliDir', () => {
    it('should return CLI directory', () => {
      const result = paths.getSocketCliDir()
      expect(result).toBe(path.join(os.homedir(), '.socket', '_socket'))
    })
  })

  describe('getSocketRegistryDir', () => {
    it('should return Registry directory', () => {
      const result = paths.getSocketRegistryDir()
      expect(result).toBe(path.join(os.homedir(), '.socket', '_registry'))
    })
  })

  describe('getSocketRegistryGithubCacheDir', () => {
    it('should return Registry GitHub cache directory', () => {
      const result = paths.getSocketRegistryGithubCacheDir()
      expect(result).toBe(
        path.join(
          os.homedir(),
          '.socket',
          '_registry',
          'cache',
          'ttl',
          'github',
        ),
      )
    })
  })

  describe('path consistency', () => {
    it('should have CLI dir as subdirectory of user dir', () => {
      const userDir = paths.getSocketUserDir()
      const cliDir = paths.getSocketCliDir()
      expect(cliDir.startsWith(userDir)).toBe(true)
    })

    it('should have registry dir as subdirectory of user dir', () => {
      const userDir = paths.getSocketUserDir()
      const registryDir = paths.getSocketRegistryDir()
      expect(registryDir.startsWith(userDir)).toBe(true)
    })

    it('should have cache dir as subdirectory of app dir', () => {
      const appDir = paths.getSocketAppDir('test')
      const cacheDir = paths.getSocketAppCacheDir('test')
      expect(cacheDir.startsWith(appDir)).toBe(true)
    })

    it('should have TTL cache dir as subdirectory of cache dir', () => {
      const cacheDir = paths.getSocketAppCacheDir('test')
      const ttlDir = paths.getSocketAppCacheTtlDir('test')
      expect(ttlDir.startsWith(cacheDir)).toBe(true)
    })

    it('should have github cache as subdirectory of registry TTL cache', () => {
      const ttlDir = paths.getSocketAppCacheTtlDir('registry')
      const githubDir = paths.getSocketRegistryGithubCacheDir()
      expect(githubDir.startsWith(ttlDir)).toBe(true)
    })
  })

  describe('platform compatibility', () => {
    it('should use correct path separators', () => {
      const result = paths.getSocketAppDir('test')
      expect(result.includes(path.sep)).toBe(true)
    })

    it('should not contain hardcoded slashes', () => {
      const result = paths.getSocketUserDir()
      const parts = result.split(path.sep)
      expect(parts[parts.length - 1]).toBe('.socket')
    })
  })
})
