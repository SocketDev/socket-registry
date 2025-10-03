import os from 'node:os'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { normalizePath } from '../../registry/dist/lib/path.js'
import {
  getSocketAppCacheDir,
  getSocketAppCacheTtlDir,
  getSocketAppDir,
  getSocketCacacheDir,
  getSocketCliDir,
  getSocketDlxDir,
  getSocketRegistryDir,
  getSocketRegistryGithubCacheDir,
  getSocketUserDir,
} from '../../registry/dist/lib/paths.js'

describe('paths module', () => {
  describe('getSocketUserDir', () => {
    it('should return ~/.socket path', () => {
      const result = getSocketUserDir()
      expect(result).toBe(normalizePath(path.join(os.homedir(), '.socket')))
    })

    it('should return consistent path on multiple calls', () => {
      const first = getSocketUserDir()
      const second = getSocketUserDir()
      expect(first).toBe(second)
    })
  })

  describe('getSocketAppDir', () => {
    it('should return app directory with underscore prefix', () => {
      const result = getSocketAppDir('test')
      expect(result).toBe(
        normalizePath(path.join(os.homedir(), '.socket', '_test')),
      )
    })

    it('should handle different app names', () => {
      const socket = getSocketAppDir('socket')
      const registry = getSocketAppDir('registry')
      expect(socket).toBe(
        normalizePath(path.join(os.homedir(), '.socket', '_socket')),
      )
      expect(registry).toBe(
        normalizePath(path.join(os.homedir(), '.socket', '_registry')),
      )
    })
  })

  describe('getSocketCacacheDir', () => {
    it('should return cacache directory', () => {
      const result = getSocketCacacheDir()
      expect(result).toBe(
        normalizePath(path.join(os.homedir(), '.socket', '_cacache')),
      )
    })
  })

  describe('getSocketDlxDir', () => {
    it('should return dlx directory', () => {
      const result = getSocketDlxDir()
      expect(result).toBe(
        normalizePath(path.join(os.homedir(), '.socket', '_dlx')),
      )
    })
  })

  describe('getSocketAppCacheDir', () => {
    it('should return app cache directory', () => {
      const result = getSocketAppCacheDir('test')
      expect(result).toBe(
        normalizePath(path.join(os.homedir(), '.socket', '_test', 'cache')),
      )
    })

    it('should handle different app names', () => {
      const socketCache = getSocketAppCacheDir('socket')
      const registryCache = getSocketAppCacheDir('registry')
      expect(socketCache).toBe(
        normalizePath(path.join(os.homedir(), '.socket', '_socket', 'cache')),
      )
      expect(registryCache).toBe(
        normalizePath(path.join(os.homedir(), '.socket', '_registry', 'cache')),
      )
    })
  })

  describe('getSocketAppCacheTtlDir', () => {
    it('should return app TTL cache directory', () => {
      const result = getSocketAppCacheTtlDir('test')
      expect(result).toBe(
        normalizePath(
          path.join(os.homedir(), '.socket', '_test', 'cache', 'ttl'),
        ),
      )
    })

    it('should handle different app names', () => {
      const socketTtl = getSocketAppCacheTtlDir('socket')
      const registryTtl = getSocketAppCacheTtlDir('registry')
      expect(socketTtl).toBe(
        normalizePath(
          path.join(os.homedir(), '.socket', '_socket', 'cache', 'ttl'),
        ),
      )
      expect(registryTtl).toBe(
        normalizePath(
          path.join(os.homedir(), '.socket', '_registry', 'cache', 'ttl'),
        ),
      )
    })
  })

  describe('getSocketCliDir', () => {
    it('should return CLI directory', () => {
      const result = getSocketCliDir()
      expect(result).toBe(
        normalizePath(path.join(os.homedir(), '.socket', '_socket')),
      )
    })
  })

  describe('getSocketRegistryDir', () => {
    it('should return Registry directory', () => {
      const result = getSocketRegistryDir()
      expect(result).toBe(
        normalizePath(path.join(os.homedir(), '.socket', '_registry')),
      )
    })
  })

  describe('getSocketRegistryGithubCacheDir', () => {
    it('should return Registry GitHub cache directory', () => {
      const result = getSocketRegistryGithubCacheDir()
      expect(result).toBe(
        normalizePath(
          path.join(
            os.homedir(),
            '.socket',
            '_registry',
            'cache',
            'ttl',
            'github',
          ),
        ),
      )
    })
  })

  describe('path consistency', () => {
    it('should have CLI dir as subdirectory of user dir', () => {
      const userDir = getSocketUserDir()
      const cliDir = getSocketCliDir()
      expect(cliDir.startsWith(userDir)).toBe(true)
    })

    it('should have registry dir as subdirectory of user dir', () => {
      const userDir = getSocketUserDir()
      const registryDir = getSocketRegistryDir()
      expect(registryDir.startsWith(userDir)).toBe(true)
    })

    it('should have cache dir as subdirectory of app dir', () => {
      const appDir = getSocketAppDir('test')
      const cacheDir = getSocketAppCacheDir('test')
      expect(cacheDir.startsWith(appDir)).toBe(true)
    })

    it('should have TTL cache dir as subdirectory of cache dir', () => {
      const cacheDir = getSocketAppCacheDir('test')
      const ttlDir = getSocketAppCacheTtlDir('test')
      expect(ttlDir.startsWith(cacheDir)).toBe(true)
    })

    it('should have github cache as subdirectory of registry TTL cache', () => {
      const ttlDir = getSocketAppCacheTtlDir('registry')
      const githubDir = getSocketRegistryGithubCacheDir()
      expect(githubDir.startsWith(ttlDir)).toBe(true)
    })
  })

  describe('platform compatibility', () => {
    it('should use normalized forward slashes', () => {
      const result = getSocketAppDir('test')
      expect(result.includes('/')).toBe(true)
    })

    it('should normalize paths correctly', () => {
      const result = getSocketUserDir()
      const parts = result.split('/')
      expect(parts[parts.length - 1]).toBe('.socket')
    })
  })
})
