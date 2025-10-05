import path from 'node:path'

import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('bun-cache-path', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.resetModules()
    process.env = { ...originalEnv }
  })

  describe('BUN_INSTALL_CACHE_DIR environment variable', () => {
    it('should use BUN_INSTALL_CACHE_DIR when set', async () => {
      process.env['BUN_INSTALL_CACHE_DIR'] = '/custom/bun/cache'
      const { default: bunCachePath } = await import(
        '../../registry/dist/lib/constants/bun-cache-path.js'
      )
      expect(bunCachePath).toBe('/custom/bun/cache')
    })

    it('should normalize BUN_INSTALL_CACHE_DIR path', async () => {
      process.env['BUN_INSTALL_CACHE_DIR'] = '/custom//bun//cache//'
      const { default: bunCachePath } = await import(
        '../../registry/dist/lib/constants/bun-cache-path.js'
      )
      expect(bunCachePath).not.toContain('\\')
      expect(bunCachePath).toContain('bun')
      expect(bunCachePath).toContain('cache')
    })
  })

  describe('Windows platform', () => {
    it('should use TEMP/bun on Windows', async () => {
      vi.stubGlobal('process', {
        ...process,
        env: { ...originalEnv, TEMP: 'C:\\Users\\Test\\AppData\\Local\\Temp' },
        platform: 'win32',
      })
      const { default: bunCachePath } = await import(
        '../../registry/dist/lib/constants/bun-cache-path.js'
      )
      expect(bunCachePath).toContain('bun')
      expect(bunCachePath).not.toContain('\\')
    })

    it('should use TMP when TEMP is not set on Windows', async () => {
      vi.stubGlobal('process', {
        ...process,
        env: { ...originalEnv, TMP: 'C:\\Windows\\Temp' },
        platform: 'win32',
      })
      const { default: bunCachePath } = await import(
        '../../registry/dist/lib/constants/bun-cache-path.js'
      )
      expect(bunCachePath).toContain('bun')
      expect(bunCachePath).not.toContain('\\')
    })

    it('should return empty string when neither TEMP nor TMP is set on Windows', async () => {
      vi.stubGlobal('process', {
        ...process,
        env: {},
        platform: 'win32',
      })
      const { default: bunCachePath } = await import(
        '../../registry/dist/lib/constants/bun-cache-path.js'
      )
      expect(bunCachePath).toBe('')
    })
  })

  describe('macOS platform', () => {
    it('should use Library/Caches/bun on macOS', async () => {
      vi.stubGlobal('process', {
        ...process,
        env: { ...originalEnv, HOME: '/Users/testuser' },
        platform: 'darwin',
      })
      const { default: bunCachePath } = await import(
        '../../registry/dist/lib/constants/bun-cache-path.js'
      )
      expect(bunCachePath).toContain('Library')
      expect(bunCachePath).toContain('Caches')
      expect(bunCachePath).toContain('bun')
    })

    it('should return empty string when HOME is not set on macOS', async () => {
      vi.stubGlobal('process', {
        ...process,
        env: {},
        platform: 'darwin',
      })
      const { default: bunCachePath } = await import(
        '../../registry/dist/lib/constants/bun-cache-path.js'
      )
      expect(bunCachePath).toBe('')
    })
  })

  describe('Linux default location', () => {
    it('should use ~/.bun/install/cache on Linux', async () => {
      vi.stubGlobal('process', {
        ...process,
        env: { ...originalEnv, HOME: '/home/testuser' },
        platform: 'linux',
      })
      const { default: bunCachePath } = await import(
        '../../registry/dist/lib/constants/bun-cache-path.js'
      )
      expect(bunCachePath).toContain('.bun')
      expect(bunCachePath).toContain('install')
      expect(bunCachePath).toContain('cache')
    })

    it('should return empty string when HOME is not set on Linux', async () => {
      vi.stubGlobal('process', {
        ...process,
        env: {},
        platform: 'linux',
      })
      const { default: bunCachePath } = await import(
        '../../registry/dist/lib/constants/bun-cache-path.js'
      )
      expect(bunCachePath).toBe('')
    })
  })

  describe('path normalization', () => {
    it('should not contain backslashes in normalized paths', async () => {
      const { default: bunCachePath } = await import(
        '../../registry/dist/lib/constants/bun-cache-path.js'
      )
      if (bunCachePath) {
        expect(bunCachePath).not.toContain('\\')
      }
    })

    it('should be a valid absolute path when set', async () => {
      const { default: bunCachePath } = await import(
        '../../registry/dist/lib/constants/bun-cache-path.js'
      )
      if (bunCachePath) {
        expect(path.isAbsolute(bunCachePath)).toBe(true)
      }
    })
  })
})
