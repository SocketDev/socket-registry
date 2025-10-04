import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { shouldSkipShadow } from '../../registry/dist/lib/shadow.js'

describe('shadow module', () => {
  let originalEnv: NodeJS.ProcessEnv

  beforeEach(() => {
    originalEnv = { ...process.env }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('shouldSkipShadow', () => {
    it('should return true on Windows with binPath', () => {
      expect(shouldSkipShadow('/usr/bin/npm', { win32: true })).toBe(true)
    })

    it('should return false on non-Windows with binPath', () => {
      expect(shouldSkipShadow('/usr/bin/npm', { win32: false })).toBe(false)
    })

    it('should return true when user agent contains exec', () => {
      process.env['npm_config_user_agent'] = 'npm/8.0.0 node/v18.0.0 exec'
      expect(shouldSkipShadow('', { win32: false })).toBe(true)
    })

    it('should return true when user agent contains npx', () => {
      process.env['npm_config_user_agent'] = 'npm/8.0.0 node/v18.0.0 npx'
      expect(shouldSkipShadow('', { win32: false })).toBe(true)
    })

    it('should return true when user agent contains dlx', () => {
      process.env['npm_config_user_agent'] = 'pnpm/8.0.0 node/v18.0.0 dlx'
      expect(shouldSkipShadow('', { win32: false })).toBe(true)
    })

    it('should return true when cwd is in npm cache', () => {
      process.env['npm_config_cache'] = '/home/user/.npm'
      expect(
        shouldSkipShadow('', {
          cwd: '/home/user/.npm/_npx/12345',
          win32: false,
        }),
      ).toBe(true)
    })

    it('should return true when cwd contains _npx', () => {
      expect(
        shouldSkipShadow('', {
          cwd: '/tmp/_npx/abc123',
          win32: false,
        }),
      ).toBe(true)
    })

    it('should return true when cwd contains .pnpm-store', () => {
      expect(
        shouldSkipShadow('', {
          cwd: '/home/user/.pnpm-store/v3/tmp',
          win32: false,
        }),
      ).toBe(true)
    })

    it('should return true when cwd contains dlx-', () => {
      expect(
        shouldSkipShadow('', {
          cwd: '/tmp/dlx-12345',
          win32: false,
        }),
      ).toBe(true)
    })

    it('should return true when cwd contains Yarn Berry PnP path', () => {
      expect(
        shouldSkipShadow('', {
          cwd: '/project/.yarn/$$/package',
          win32: false,
        }),
      ).toBe(true)
    })

    it('should return true when cwd contains Yarn Windows temp path', () => {
      expect(
        shouldSkipShadow('', {
          cwd: 'C:\\Users\\Test\\AppData\\Local\\Temp\\xfs-abc123',
          win32: false,
        }),
      ).toBe(true)
    })

    it('should return false for normal project directory', () => {
      expect(
        shouldSkipShadow('', {
          cwd: '/home/user/projects/my-app',
          win32: false,
        }),
      ).toBe(false)
    })

    it('should return false when no special conditions are met', () => {
      delete process.env['npm_config_user_agent']
      delete process.env['npm_config_cache']
      expect(
        shouldSkipShadow('', {
          cwd: '/home/user/project',
          win32: false,
        }),
      ).toBe(false)
    })

    it('should handle empty binPath on Windows', () => {
      expect(shouldSkipShadow('', { win32: true })).toBe(false)
    })

    it('should handle undefined options', () => {
      expect(shouldSkipShadow('')).toBe(false)
    })
  })
})
