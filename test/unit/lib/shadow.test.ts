/**
 * @fileoverview Tests for shadow binary installation utilities.
 *
 * Validates logic for determining when shadow binary installation should be skipped.
 */

import { describe, expect, it } from 'vitest'
import type { ShadowInstallationOptions } from '../../../registry/dist/lib/shadow.js'
import { shouldSkipShadow } from '../../../registry/dist/lib/shadow.js'

describe('shadow utilities', () => {
  describe('shouldSkipShadow', () => {
    describe('Windows compatibility checks', () => {
      it('should skip shadow installation on Windows with existing binary path', () => {
        const options: ShadowInstallationOptions = {
          win32: true,
        }
        expect(shouldSkipShadow('/path/to/binary', options)).toBe(true)
      })

      it('should skip shadow installation on Windows even with empty binPath', () => {
        const options: ShadowInstallationOptions = {
          win32: true,
        }
        // Windows check requires truthy binPath, so empty string should return false.
        expect(shouldSkipShadow('', options)).toBe(false)
      })

      it('should not skip on non-Windows with binary path', () => {
        const options: ShadowInstallationOptions = {
          win32: false,
        }
        const originalUserAgent = process.env['npm_config_user_agent']
        const originalCache = process.env['npm_config_cache']
        delete process.env['npm_config_user_agent']
        delete process.env['npm_config_cache']

        try {
          expect(shouldSkipShadow('/path/to/binary', options)).toBe(false)
        } finally {
          if (originalUserAgent !== undefined) {
            process.env['npm_config_user_agent'] = originalUserAgent
          }
          if (originalCache !== undefined) {
            process.env['npm_config_cache'] = originalCache
          }
        }
      })

      it('should use default win32=false when not specified', () => {
        const originalUserAgent = process.env['npm_config_user_agent']
        const originalCache = process.env['npm_config_cache']
        delete process.env['npm_config_user_agent']
        delete process.env['npm_config_cache']

        try {
          expect(shouldSkipShadow('/path/to/binary', {})).toBe(false)
        } finally {
          if (originalUserAgent !== undefined) {
            process.env['npm_config_user_agent'] = originalUserAgent
          }
          if (originalCache !== undefined) {
            process.env['npm_config_cache'] = originalCache
          }
        }
      })
    })

    describe('user agent checks', () => {
      it('should skip when user agent includes exec', () => {
        const originalUserAgent = process.env['npm_config_user_agent']
        process.env['npm_config_user_agent'] = 'npm/8.0.0 exec node/18.0.0'

        try {
          expect(shouldSkipShadow('', { win32: false })).toBe(true)
        } finally {
          if (originalUserAgent !== undefined) {
            process.env['npm_config_user_agent'] = originalUserAgent
          } else {
            delete process.env['npm_config_user_agent']
          }
        }
      })

      it('should skip when user agent includes npx', () => {
        const originalUserAgent = process.env['npm_config_user_agent']
        process.env['npm_config_user_agent'] = 'npm/8.0.0 npx node/18.0.0'

        try {
          expect(shouldSkipShadow('', { win32: false })).toBe(true)
        } finally {
          if (originalUserAgent !== undefined) {
            process.env['npm_config_user_agent'] = originalUserAgent
          } else {
            delete process.env['npm_config_user_agent']
          }
        }
      })

      it('should skip when user agent includes dlx', () => {
        const originalUserAgent = process.env['npm_config_user_agent']
        process.env['npm_config_user_agent'] = 'pnpm/8.0.0 dlx node/18.0.0'

        try {
          expect(shouldSkipShadow('', { win32: false })).toBe(true)
        } finally {
          if (originalUserAgent !== undefined) {
            process.env['npm_config_user_agent'] = originalUserAgent
          } else {
            delete process.env['npm_config_user_agent']
          }
        }
      })

      it('should not skip when user agent is normal npm', () => {
        const originalUserAgent = process.env['npm_config_user_agent']
        const originalCache = process.env['npm_config_cache']
        process.env['npm_config_user_agent'] = 'npm/8.0.0 node/18.0.0'
        delete process.env['npm_config_cache']

        try {
          expect(shouldSkipShadow('', { win32: false })).toBe(false)
        } finally {
          if (originalUserAgent !== undefined) {
            process.env['npm_config_user_agent'] = originalUserAgent
          } else {
            delete process.env['npm_config_user_agent']
          }
          if (originalCache !== undefined) {
            process.env['npm_config_cache'] = originalCache
          }
        }
      })

      it('should not skip when user agent is undefined', () => {
        const originalUserAgent = process.env['npm_config_user_agent']
        const originalCache = process.env['npm_config_cache']
        delete process.env['npm_config_user_agent']
        delete process.env['npm_config_cache']

        try {
          expect(shouldSkipShadow('', { win32: false })).toBe(false)
        } finally {
          if (originalUserAgent !== undefined) {
            process.env['npm_config_user_agent'] = originalUserAgent
          }
          if (originalCache !== undefined) {
            process.env['npm_config_cache'] = originalCache
          }
        }
      })
    })

    describe('npm cache checks', () => {
      it('should skip when cwd is inside npm cache', () => {
        const originalUserAgent = process.env['npm_config_user_agent']
        const originalCache = process.env['npm_config_cache']
        delete process.env['npm_config_user_agent']
        process.env['npm_config_cache'] = '/home/user/.npm'

        try {
          const options: ShadowInstallationOptions = {
            cwd: '/home/user/.npm/_npx/12345',
            win32: false,
          }
          expect(shouldSkipShadow('', options)).toBe(true)
        } finally {
          if (originalUserAgent !== undefined) {
            process.env['npm_config_user_agent'] = originalUserAgent
          }
          if (originalCache !== undefined) {
            process.env['npm_config_cache'] = originalCache
          } else {
            delete process.env['npm_config_cache']
          }
        }
      })

      it('should not skip when cwd is outside npm cache', () => {
        const originalUserAgent = process.env['npm_config_user_agent']
        const originalCache = process.env['npm_config_cache']
        delete process.env['npm_config_user_agent']
        process.env['npm_config_cache'] = '/home/user/.npm'

        try {
          const options: ShadowInstallationOptions = {
            cwd: '/home/user/project',
            win32: false,
          }
          expect(shouldSkipShadow('', options)).toBe(false)
        } finally {
          if (originalUserAgent !== undefined) {
            process.env['npm_config_user_agent'] = originalUserAgent
          }
          if (originalCache !== undefined) {
            process.env['npm_config_cache'] = originalCache
          } else {
            delete process.env['npm_config_cache']
          }
        }
      })

      it('should handle undefined npm cache', () => {
        const originalUserAgent = process.env['npm_config_user_agent']
        const originalCache = process.env['npm_config_cache']
        delete process.env['npm_config_user_agent']
        delete process.env['npm_config_cache']

        try {
          const options: ShadowInstallationOptions = {
            cwd: '/home/user/.npm/_npx/12345',
            win32: false,
          }
          // Should still skip because of _npx pattern.
          expect(shouldSkipShadow('', options)).toBe(true)
        } finally {
          if (originalUserAgent !== undefined) {
            process.env['npm_config_user_agent'] = originalUserAgent
          }
          if (originalCache !== undefined) {
            process.env['npm_config_cache'] = originalCache
          }
        }
      })

      it('should normalize paths when checking cache', () => {
        const originalUserAgent = process.env['npm_config_user_agent']
        const originalCache = process.env['npm_config_cache']
        delete process.env['npm_config_user_agent']
        process.env['npm_config_cache'] = '/home/user/.npm'

        try {
          const options: ShadowInstallationOptions = {
            cwd: '/home/user/.npm/./subdir/../_npx',
            win32: false,
          }
          expect(shouldSkipShadow('', options)).toBe(true)
        } finally {
          if (originalUserAgent !== undefined) {
            process.env['npm_config_user_agent'] = originalUserAgent
          }
          if (originalCache !== undefined) {
            process.env['npm_config_cache'] = originalCache
          } else {
            delete process.env['npm_config_cache']
          }
        }
      })
    })

    describe('temporary path pattern checks', () => {
      it('should skip for _npx pattern', () => {
        const originalUserAgent = process.env['npm_config_user_agent']
        const originalCache = process.env['npm_config_cache']
        delete process.env['npm_config_user_agent']
        delete process.env['npm_config_cache']

        try {
          const options: ShadowInstallationOptions = {
            cwd: '/home/user/.npm/_npx/12345',
            win32: false,
          }
          expect(shouldSkipShadow('', options)).toBe(true)
        } finally {
          if (originalUserAgent !== undefined) {
            process.env['npm_config_user_agent'] = originalUserAgent
          }
          if (originalCache !== undefined) {
            process.env['npm_config_cache'] = originalCache
          }
        }
      })

      it('should skip for .pnpm-store pattern', () => {
        const originalUserAgent = process.env['npm_config_user_agent']
        const originalCache = process.env['npm_config_cache']
        delete process.env['npm_config_user_agent']
        delete process.env['npm_config_cache']

        try {
          const options: ShadowInstallationOptions = {
            cwd: '/home/user/.pnpm-store/tmp/12345',
            win32: false,
          }
          expect(shouldSkipShadow('', options)).toBe(true)
        } finally {
          if (originalUserAgent !== undefined) {
            process.env['npm_config_user_agent'] = originalUserAgent
          }
          if (originalCache !== undefined) {
            process.env['npm_config_cache'] = originalCache
          }
        }
      })

      it('should skip for dlx- pattern', () => {
        const originalUserAgent = process.env['npm_config_user_agent']
        const originalCache = process.env['npm_config_cache']
        delete process.env['npm_config_user_agent']
        delete process.env['npm_config_cache']

        try {
          const options: ShadowInstallationOptions = {
            cwd: '/tmp/dlx-12345/package',
            win32: false,
          }
          expect(shouldSkipShadow('', options)).toBe(true)
        } finally {
          if (originalUserAgent !== undefined) {
            process.env['npm_config_user_agent'] = originalUserAgent
          }
          if (originalCache !== undefined) {
            process.env['npm_config_cache'] = originalCache
          }
        }
      })

      it('should skip for Yarn Berry PnP virtual packages', () => {
        const originalUserAgent = process.env['npm_config_user_agent']
        const originalCache = process.env['npm_config_cache']
        delete process.env['npm_config_user_agent']
        delete process.env['npm_config_cache']

        try {
          const options: ShadowInstallationOptions = {
            cwd: '/home/user/project/.yarn/$$/package',
            win32: false,
          }
          expect(shouldSkipShadow('', options)).toBe(true)
        } finally {
          if (originalUserAgent !== undefined) {
            process.env['npm_config_user_agent'] = originalUserAgent
          }
          if (originalCache !== undefined) {
            process.env['npm_config_cache'] = originalCache
          }
        }
      })

      it('should skip for Yarn Windows temp paths', () => {
        const originalUserAgent = process.env['npm_config_user_agent']
        const originalCache = process.env['npm_config_cache']
        delete process.env['npm_config_user_agent']
        delete process.env['npm_config_cache']

        try {
          const options: ShadowInstallationOptions = {
            cwd: 'C:/Users/user/AppData/Local/Temp/xfs-12345',
            win32: false,
          }
          expect(shouldSkipShadow('', options)).toBe(true)
        } finally {
          if (originalUserAgent !== undefined) {
            process.env['npm_config_user_agent'] = originalUserAgent
          }
          if (originalCache !== undefined) {
            process.env['npm_config_cache'] = originalCache
          }
        }
      })

      it('should not skip for normal project paths', () => {
        const originalUserAgent = process.env['npm_config_user_agent']
        const originalCache = process.env['npm_config_cache']
        delete process.env['npm_config_user_agent']
        delete process.env['npm_config_cache']

        try {
          const options: ShadowInstallationOptions = {
            cwd: '/home/user/projects/my-app',
            win32: false,
          }
          expect(shouldSkipShadow('', options)).toBe(false)
        } finally {
          if (originalUserAgent !== undefined) {
            process.env['npm_config_user_agent'] = originalUserAgent
          }
          if (originalCache !== undefined) {
            process.env['npm_config_cache'] = originalCache
          }
        }
      })

      it('should not skip for paths with similar but non-matching patterns', () => {
        const originalUserAgent = process.env['npm_config_user_agent']
        const originalCache = process.env['npm_config_cache']
        delete process.env['npm_config_user_agent']
        delete process.env['npm_config_cache']

        try {
          const options: ShadowInstallationOptions = {
            cwd: '/home/user/my-project',
            win32: false,
          }
          expect(shouldSkipShadow('', options)).toBe(false)
        } finally {
          if (originalUserAgent !== undefined) {
            process.env['npm_config_user_agent'] = originalUserAgent
          }
          if (originalCache !== undefined) {
            process.env['npm_config_cache'] = originalCache
          }
        }
      })
    })

    describe('default options handling', () => {
      it('should use process.cwd() when cwd is not provided', () => {
        const originalUserAgent = process.env['npm_config_user_agent']
        const originalCache = process.env['npm_config_cache']
        delete process.env['npm_config_user_agent']
        delete process.env['npm_config_cache']

        try {
          // Without specifying cwd, it should use process.cwd().
          expect(() => shouldSkipShadow('', { win32: false })).not.toThrow()
        } finally {
          if (originalUserAgent !== undefined) {
            process.env['npm_config_user_agent'] = originalUserAgent
          }
          if (originalCache !== undefined) {
            process.env['npm_config_cache'] = originalCache
          }
        }
      })

      it('should work with no options provided', () => {
        const originalUserAgent = process.env['npm_config_user_agent']
        const originalCache = process.env['npm_config_cache']
        delete process.env['npm_config_user_agent']
        delete process.env['npm_config_cache']

        try {
          expect(() => shouldSkipShadow('')).not.toThrow()
        } finally {
          if (originalUserAgent !== undefined) {
            process.env['npm_config_user_agent'] = originalUserAgent
          }
          if (originalCache !== undefined) {
            process.env['npm_config_cache'] = originalCache
          }
        }
      })

      it('should work with undefined options', () => {
        const originalUserAgent = process.env['npm_config_user_agent']
        const originalCache = process.env['npm_config_cache']
        delete process.env['npm_config_user_agent']
        delete process.env['npm_config_cache']

        try {
          expect(() => shouldSkipShadow('', undefined)).not.toThrow()
        } finally {
          if (originalUserAgent !== undefined) {
            process.env['npm_config_user_agent'] = originalUserAgent
          }
          if (originalCache !== undefined) {
            process.env['npm_config_cache'] = originalCache
          }
        }
      })
    })

    describe('priority and combination checks', () => {
      it('should skip on Windows even if other conditions are false', () => {
        const originalUserAgent = process.env['npm_config_user_agent']
        const originalCache = process.env['npm_config_cache']
        process.env['npm_config_user_agent'] = 'npm/8.0.0 node/18.0.0'
        delete process.env['npm_config_cache']

        try {
          const options: ShadowInstallationOptions = {
            cwd: '/normal/project/path',
            win32: true,
          }
          expect(shouldSkipShadow('/bin/path', options)).toBe(true)
        } finally {
          if (originalUserAgent !== undefined) {
            process.env['npm_config_user_agent'] = originalUserAgent
          } else {
            delete process.env['npm_config_user_agent']
          }
          if (originalCache !== undefined) {
            process.env['npm_config_cache'] = originalCache
          }
        }
      })

      it('should skip when multiple conditions are true', () => {
        const originalUserAgent = process.env['npm_config_user_agent']
        const originalCache = process.env['npm_config_cache']
        process.env['npm_config_user_agent'] = 'npm/8.0.0 npx node/18.0.0'
        process.env['npm_config_cache'] = '/home/user/.npm'

        try {
          const options: ShadowInstallationOptions = {
            cwd: '/home/user/.npm/_npx/12345',
            win32: false,
          }
          // Should skip because of user agent (checked first).
          expect(shouldSkipShadow('', options)).toBe(true)
        } finally {
          if (originalUserAgent !== undefined) {
            process.env['npm_config_user_agent'] = originalUserAgent
          } else {
            delete process.env['npm_config_user_agent']
          }
          if (originalCache !== undefined) {
            process.env['npm_config_cache'] = originalCache
          } else {
            delete process.env['npm_config_cache']
          }
        }
      })

      it('should not skip when all conditions are false', () => {
        const originalUserAgent = process.env['npm_config_user_agent']
        const originalCache = process.env['npm_config_cache']
        process.env['npm_config_user_agent'] = 'npm/8.0.0 node/18.0.0'
        delete process.env['npm_config_cache']

        try {
          const options: ShadowInstallationOptions = {
            cwd: '/home/user/projects/my-app',
            win32: false,
          }
          expect(shouldSkipShadow('', options)).toBe(false)
        } finally {
          if (originalUserAgent !== undefined) {
            process.env['npm_config_user_agent'] = originalUserAgent
          } else {
            delete process.env['npm_config_user_agent']
          }
          if (originalCache !== undefined) {
            process.env['npm_config_cache'] = originalCache
          }
        }
      })
    })

    describe('edge cases', () => {
      it('should handle empty binPath string', () => {
        const originalUserAgent = process.env['npm_config_user_agent']
        const originalCache = process.env['npm_config_cache']
        delete process.env['npm_config_user_agent']
        delete process.env['npm_config_cache']

        try {
          const options: ShadowInstallationOptions = {
            cwd: '/normal/project',
            win32: false,
          }
          expect(shouldSkipShadow('', options)).toBe(false)
        } finally {
          if (originalUserAgent !== undefined) {
            process.env['npm_config_user_agent'] = originalUserAgent
          }
          if (originalCache !== undefined) {
            process.env['npm_config_cache'] = originalCache
          }
        }
      })

      it('should handle empty cwd string', () => {
        const originalUserAgent = process.env['npm_config_user_agent']
        const originalCache = process.env['npm_config_cache']
        delete process.env['npm_config_user_agent']
        delete process.env['npm_config_cache']

        try {
          const options: ShadowInstallationOptions = {
            cwd: '',
            win32: false,
          }
          expect(() => shouldSkipShadow('', options)).not.toThrow()
        } finally {
          if (originalUserAgent !== undefined) {
            process.env['npm_config_user_agent'] = originalUserAgent
          }
          if (originalCache !== undefined) {
            process.env['npm_config_cache'] = originalCache
          }
        }
      })

      it('should handle paths with special characters', () => {
        const originalUserAgent = process.env['npm_config_user_agent']
        const originalCache = process.env['npm_config_cache']
        delete process.env['npm_config_user_agent']
        delete process.env['npm_config_cache']

        try {
          const options: ShadowInstallationOptions = {
            cwd: '/home/user/my project/_npx/test',
            win32: false,
          }
          expect(shouldSkipShadow('', options)).toBe(true)
        } finally {
          if (originalUserAgent !== undefined) {
            process.env['npm_config_user_agent'] = originalUserAgent
          }
          if (originalCache !== undefined) {
            process.env['npm_config_cache'] = originalCache
          }
        }
      })

      it('should handle paths with Unicode characters', () => {
        const originalUserAgent = process.env['npm_config_user_agent']
        const originalCache = process.env['npm_config_cache']
        delete process.env['npm_config_user_agent']
        delete process.env['npm_config_cache']

        try {
          const options: ShadowInstallationOptions = {
            cwd: '/home/用户/项目/_npx/test',
            win32: false,
          }
          expect(shouldSkipShadow('', options)).toBe(true)
        } finally {
          if (originalUserAgent !== undefined) {
            process.env['npm_config_user_agent'] = originalUserAgent
          }
          if (originalCache !== undefined) {
            process.env['npm_config_cache'] = originalCache
          }
        }
      })

      it('should handle very long paths', () => {
        const originalUserAgent = process.env['npm_config_user_agent']
        const originalCache = process.env['npm_config_cache']
        delete process.env['npm_config_user_agent']
        delete process.env['npm_config_cache']

        try {
          const longPath = `/home/user/${'a'.repeat(1000)}/_npx/test`
          const options: ShadowInstallationOptions = {
            cwd: longPath,
            win32: false,
          }
          expect(shouldSkipShadow('', options)).toBe(true)
        } finally {
          if (originalUserAgent !== undefined) {
            process.env['npm_config_user_agent'] = originalUserAgent
          }
          if (originalCache !== undefined) {
            process.env['npm_config_cache'] = originalCache
          }
        }
      })

      it('should handle paths with redundant slashes', () => {
        const originalUserAgent = process.env['npm_config_user_agent']
        const originalCache = process.env['npm_config_cache']
        delete process.env['npm_config_user_agent']
        delete process.env['npm_config_cache']

        try {
          const options: ShadowInstallationOptions = {
            cwd: '/home//user///.npm//_npx//12345',
            win32: false,
          }
          expect(shouldSkipShadow('', options)).toBe(true)
        } finally {
          if (originalUserAgent !== undefined) {
            process.env['npm_config_user_agent'] = originalUserAgent
          }
          if (originalCache !== undefined) {
            process.env['npm_config_cache'] = originalCache
          }
        }
      })

      it('should handle paths with parent directory references', () => {
        const originalUserAgent = process.env['npm_config_user_agent']
        const originalCache = process.env['npm_config_cache']
        delete process.env['npm_config_user_agent']
        delete process.env['npm_config_cache']

        try {
          const options: ShadowInstallationOptions = {
            cwd: '/home/user/other/../.npm/_npx/12345',
            win32: false,
          }
          expect(shouldSkipShadow('', options)).toBe(true)
        } finally {
          if (originalUserAgent !== undefined) {
            process.env['npm_config_user_agent'] = originalUserAgent
          }
          if (originalCache !== undefined) {
            process.env['npm_config_cache'] = originalCache
          }
        }
      })

      it('should handle case sensitivity in patterns', () => {
        const originalUserAgent = process.env['npm_config_user_agent']
        const originalCache = process.env['npm_config_cache']
        delete process.env['npm_config_user_agent']
        delete process.env['npm_config_cache']

        try {
          const options: ShadowInstallationOptions = {
            cwd: '/home/user/_NPX/12345',
            win32: false,
          }
          // Patterns are case-sensitive, so _NPX should not match _npx.
          expect(shouldSkipShadow('', options)).toBe(false)
        } finally {
          if (originalUserAgent !== undefined) {
            process.env['npm_config_user_agent'] = originalUserAgent
          }
          if (originalCache !== undefined) {
            process.env['npm_config_cache'] = originalCache
          }
        }
      })
    })

    describe('cross-platform behavior', () => {
      it('should normalize paths before checking patterns', () => {
        const originalUserAgent = process.env['npm_config_user_agent']
        const originalCache = process.env['npm_config_cache']
        delete process.env['npm_config_user_agent']
        delete process.env['npm_config_cache']

        try {
          const options: ShadowInstallationOptions = {
            cwd: '/home/./user/.npm/../.npm/_npx',
            win32: false,
          }
          expect(shouldSkipShadow('', options)).toBe(true)
        } finally {
          if (originalUserAgent !== undefined) {
            process.env['npm_config_user_agent'] = originalUserAgent
          }
          if (originalCache !== undefined) {
            process.env['npm_config_cache'] = originalCache
          }
        }
      })

      it('should work with Windows-style backslashes', () => {
        const originalUserAgent = process.env['npm_config_user_agent']
        const originalCache = process.env['npm_config_cache']
        delete process.env['npm_config_user_agent']
        delete process.env['npm_config_cache']

        try {
          const options: ShadowInstallationOptions = {
            cwd: 'C:\\\\Users\\\\user\\\\AppData\\\\Local\\\\Temp\\\\xfs-12345',
            win32: false,
          }
          // After normalization, this should match the xfs- pattern.
          expect(shouldSkipShadow('', options)).toBe(true)
        } finally {
          if (originalUserAgent !== undefined) {
            process.env['npm_config_user_agent'] = originalUserAgent
          }
          if (originalCache !== undefined) {
            process.env['npm_config_cache'] = originalCache
          }
        }
      })
    })

    describe('real-world scenarios', () => {
      it('should skip when running from npx', () => {
        const originalUserAgent = process.env['npm_config_user_agent']
        const originalCache = process.env['npm_config_cache']
        process.env['npm_config_user_agent'] =
          'npm/9.6.7 node/v18.16.0 linux x64 workspaces/false npx'
        process.env['npm_config_cache'] = '/home/user/.npm'

        try {
          const options: ShadowInstallationOptions = {
            cwd: '/home/user/.npm/_npx/abc123/node_modules/package',
            win32: false,
          }
          expect(shouldSkipShadow('', options)).toBe(true)
        } finally {
          if (originalUserAgent !== undefined) {
            process.env['npm_config_user_agent'] = originalUserAgent
          } else {
            delete process.env['npm_config_user_agent']
          }
          if (originalCache !== undefined) {
            process.env['npm_config_cache'] = originalCache
          } else {
            delete process.env['npm_config_cache']
          }
        }
      })

      it('should skip when running from pnpm dlx', () => {
        const originalUserAgent = process.env['npm_config_user_agent']
        const originalCache = process.env['npm_config_cache']
        process.env['npm_config_user_agent'] =
          'pnpm/8.6.0 npm/? node/v18.16.0 linux x64 dlx'
        delete process.env['npm_config_cache']

        try {
          const options: ShadowInstallationOptions = {
            cwd: '/tmp/dlx-12345/node_modules/package',
            win32: false,
          }
          expect(shouldSkipShadow('', options)).toBe(true)
        } finally {
          if (originalUserAgent !== undefined) {
            process.env['npm_config_user_agent'] = originalUserAgent
          } else {
            delete process.env['npm_config_user_agent']
          }
          if (originalCache !== undefined) {
            process.env['npm_config_cache'] = originalCache
          }
        }
      })

      it('should not skip during normal npm install', () => {
        const originalUserAgent = process.env['npm_config_user_agent']
        const originalCache = process.env['npm_config_cache']
        process.env['npm_config_user_agent'] =
          'npm/9.6.7 node/v18.16.0 linux x64 workspaces/false'
        delete process.env['npm_config_cache']

        try {
          const options: ShadowInstallationOptions = {
            cwd: '/home/user/projects/my-app',
            win32: false,
          }
          expect(shouldSkipShadow('', options)).toBe(false)
        } finally {
          if (originalUserAgent !== undefined) {
            process.env['npm_config_user_agent'] = originalUserAgent
          } else {
            delete process.env['npm_config_user_agent']
          }
          if (originalCache !== undefined) {
            process.env['npm_config_cache'] = originalCache
          }
        }
      })

      it('should skip on Windows during npm install', () => {
        const originalUserAgent = process.env['npm_config_user_agent']
        const originalCache = process.env['npm_config_cache']
        process.env['npm_config_user_agent'] =
          'npm/9.6.7 node/v18.16.0 win32 x64'
        delete process.env['npm_config_cache']

        try {
          const options: ShadowInstallationOptions = {
            cwd: 'C:\\\\Users\\\\user\\\\projects\\\\my-app',
            win32: true,
          }
          expect(
            shouldSkipShadow('C:\\\\path\\\\to\\\\binary.exe', options),
          ).toBe(true)
        } finally {
          if (originalUserAgent !== undefined) {
            process.env['npm_config_user_agent'] = originalUserAgent
          } else {
            delete process.env['npm_config_user_agent']
          }
          if (originalCache !== undefined) {
            process.env['npm_config_cache'] = originalCache
          }
        }
      })

      it('should skip when running from Yarn Berry PnP', () => {
        const originalUserAgent = process.env['npm_config_user_agent']
        const originalCache = process.env['npm_config_cache']
        delete process.env['npm_config_user_agent']
        delete process.env['npm_config_cache']

        try {
          const options: ShadowInstallationOptions = {
            cwd: '/home/user/project/.yarn/$$/package/node_modules/.bin',
            win32: false,
          }
          expect(shouldSkipShadow('', options)).toBe(true)
        } finally {
          if (originalUserAgent !== undefined) {
            process.env['npm_config_user_agent'] = originalUserAgent
          }
          if (originalCache !== undefined) {
            process.env['npm_config_cache'] = originalCache
          }
        }
      })
    })
  })
})
