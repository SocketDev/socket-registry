import path from 'node:path'

import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('pnpm-store-path', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.resetModules()
    process.env = { ...originalEnv }
  })

  describe('PNPM_HOME environment variable', () => {
    it('should use PNPM_HOME when set', async () => {
      process.env['PNPM_HOME'] = '/custom/pnpm'
      const { default: pnpmStorePath } = await import(
        '../../registry/dist/lib/constants/pnpm-store-path.js'
      )
      expect(pnpmStorePath).toBe('/custom/pnpm/store')
    })

    it('should normalize PNPM_HOME path', async () => {
      process.env['PNPM_HOME'] = '/custom//pnpm//'
      const { default: pnpmStorePath } = await import(
        '../../registry/dist/lib/constants/pnpm-store-path.js'
      )
      expect(pnpmStorePath).not.toContain('\\')
      expect(pnpmStorePath).toContain('pnpm/store')
    })
  })

  describe('Windows platform', () => {
    it('should use LOCALAPPDATA on Windows', async () => {
      vi.stubGlobal('process', {
        ...process,
        env: {
          ...originalEnv,
          LOCALAPPDATA: 'C:\\Users\\Test\\AppData\\Local',
        },
        platform: 'win32',
      })
      const { default: pnpmStorePath } = await import(
        '../../registry/dist/lib/constants/pnpm-store-path.js'
      )
      expect(pnpmStorePath).toContain('pnpm')
      expect(pnpmStorePath).toContain('store')
      expect(pnpmStorePath).not.toContain('\\')
    })

    it('should return empty string when LOCALAPPDATA is not set on Windows', async () => {
      vi.stubGlobal('process', {
        ...process,
        env: {},
        platform: 'win32',
      })
      const { default: pnpmStorePath } = await import(
        '../../registry/dist/lib/constants/pnpm-store-path.js'
      )
      expect(pnpmStorePath).toBe('')
    })
  })

  describe('XDG Base Directory on Unix', () => {
    it('should use XDG_DATA_HOME when set', async () => {
      vi.stubGlobal('process', {
        ...process,
        env: {
          ...originalEnv,
          HOME: '/home/testuser',
          XDG_DATA_HOME: '/home/testuser/.local/share',
        },
        platform: 'linux',
      })
      const { default: pnpmStorePath } = await import(
        '../../registry/dist/lib/constants/pnpm-store-path.js'
      )
      expect(pnpmStorePath).toContain('pnpm')
      expect(pnpmStorePath).toContain('store')
    })
  })

  describe('macOS platform', () => {
    it('should use Library/pnpm/store on macOS', async () => {
      vi.stubGlobal('process', {
        ...process,
        env: { ...originalEnv, HOME: '/Users/testuser' },
        platform: 'darwin',
      })
      const { default: pnpmStorePath } = await import(
        '../../registry/dist/lib/constants/pnpm-store-path.js'
      )
      expect(pnpmStorePath).toContain('Library')
      expect(pnpmStorePath).toContain('pnpm')
      expect(pnpmStorePath).toContain('store')
    })
  })

  describe('Linux default location', () => {
    it('should use ~/.local/share/pnpm/store on Linux', async () => {
      vi.stubGlobal('process', {
        ...process,
        env: { ...originalEnv, HOME: '/home/testuser' },
        platform: 'linux',
      })
      const { default: pnpmStorePath } = await import(
        '../../registry/dist/lib/constants/pnpm-store-path.js'
      )
      expect(pnpmStorePath).toContain('.local')
      expect(pnpmStorePath).toContain('share')
      expect(pnpmStorePath).toContain('pnpm')
      expect(pnpmStorePath).toContain('store')
    })

    it('should return empty string when HOME is not set on Linux', async () => {
      vi.stubGlobal('process', {
        ...process,
        env: {},
        platform: 'linux',
      })
      const { default: pnpmStorePath } = await import(
        '../../registry/dist/lib/constants/pnpm-store-path.js'
      )
      expect(pnpmStorePath).toBe('')
    })
  })

  describe('path normalization', () => {
    it('should not contain backslashes in normalized paths', async () => {
      const { default: pnpmStorePath } = await import(
        '../../registry/dist/lib/constants/pnpm-store-path.js'
      )
      if (pnpmStorePath) {
        expect(pnpmStorePath).not.toContain('\\')
      }
    })

    it('should be a valid absolute path when set', async () => {
      const { default: pnpmStorePath } = await import(
        '../../registry/dist/lib/constants/pnpm-store-path.js'
      )
      if (pnpmStorePath) {
        expect(path.isAbsolute(pnpmStorePath)).toBe(true)
      }
    })
  })
})
