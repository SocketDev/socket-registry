import path from 'node:path'

import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('vlt-cache-path', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.resetModules()
    process.env = { ...originalEnv }
  })

  describe('Windows platform', () => {
    it('should use LOCALAPPDATA/vlt/Cache on Windows', async () => {
      vi.stubGlobal('process', {
        ...process,
        env: {
          ...originalEnv,
          LOCALAPPDATA: 'C:\\Users\\Test\\AppData\\Local',
        },
        platform: 'win32',
      })
      const { default: vltCachePath } = await import(
        '../../registry/dist/lib/constants/vlt-cache-path.js'
      )
      expect(vltCachePath).toContain('vlt')
      expect(vltCachePath).toContain('Cache')
      expect(vltCachePath).not.toContain('\\')
    })

    it('should return empty string when LOCALAPPDATA is not set on Windows', async () => {
      vi.stubGlobal('process', {
        ...process,
        env: {},
        platform: 'win32',
      })
      const { default: vltCachePath } = await import(
        '../../registry/dist/lib/constants/vlt-cache-path.js'
      )
      expect(vltCachePath).toBe('')
    })
  })

  describe('macOS platform', () => {
    it('should use Library/Caches/vlt on macOS', async () => {
      vi.stubGlobal('process', {
        ...process,
        env: { ...originalEnv, HOME: '/Users/testuser' },
        platform: 'darwin',
      })
      const { default: vltCachePath } = await import(
        '../../registry/dist/lib/constants/vlt-cache-path.js'
      )
      expect(vltCachePath).toContain('Library')
      expect(vltCachePath).toContain('Caches')
      expect(vltCachePath).toContain('vlt')
    })

    it('should return empty string when HOME is not set on macOS', async () => {
      vi.stubGlobal('process', {
        ...process,
        env: {},
        platform: 'darwin',
      })
      const { default: vltCachePath } = await import(
        '../../registry/dist/lib/constants/vlt-cache-path.js'
      )
      expect(vltCachePath).toBe('')
    })
  })

  describe('Linux with XDG_CACHE_HOME', () => {
    it('should use XDG_CACHE_HOME/vlt when set', async () => {
      vi.stubGlobal('process', {
        ...process,
        env: {
          ...originalEnv,
          HOME: '/home/testuser',
          XDG_CACHE_HOME: '/home/testuser/.cache',
        },
        platform: 'linux',
      })
      const { default: vltCachePath } = await import(
        '../../registry/dist/lib/constants/vlt-cache-path.js'
      )
      expect(vltCachePath).toContain('vlt')
      expect(vltCachePath).not.toContain('\\')
    })
  })

  describe('Linux default location', () => {
    it('should use ~/.cache/vlt on Linux', async () => {
      vi.stubGlobal('process', {
        ...process,
        env: { ...originalEnv, HOME: '/home/testuser' },
        platform: 'linux',
      })
      const { default: vltCachePath } = await import(
        '../../registry/dist/lib/constants/vlt-cache-path.js'
      )
      expect(vltCachePath).toContain('.cache')
      expect(vltCachePath).toContain('vlt')
    })

    it('should return empty string when HOME is not set on Linux', async () => {
      vi.stubGlobal('process', {
        ...process,
        env: {},
        platform: 'linux',
      })
      const { default: vltCachePath } = await import(
        '../../registry/dist/lib/constants/vlt-cache-path.js'
      )
      expect(vltCachePath).toBe('')
    })
  })

  describe('path normalization', () => {
    it('should not contain backslashes in normalized paths', async () => {
      const { default: vltCachePath } = await import(
        '../../registry/dist/lib/constants/vlt-cache-path.js'
      )
      if (vltCachePath) {
        expect(vltCachePath).not.toContain('\\')
      }
    })

    it('should be a valid absolute path when set', async () => {
      const { default: vltCachePath } = await import(
        '../../registry/dist/lib/constants/vlt-cache-path.js'
      )
      if (vltCachePath) {
        expect(path.isAbsolute(vltCachePath)).toBe(true)
      }
    })
  })
})
