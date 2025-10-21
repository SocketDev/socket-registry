/**
 * @fileoverview Tests for temporary package executor detection utilities.
 *
 * Validates detection of temporary execution contexts like npx, pnpm dlx, and yarn dlx.
 */

import { isRunningInTemporaryExecutor } from '@socketsecurity/lib/temporary-executor'
import { describe, expect, it } from 'vitest'

describe('temporary-executor utilities', () => {
  describe('isRunningInTemporaryExecutor', () => {
    describe('environment variable detection', () => {
      it('should return true when npm_config_user_agent contains "exec"', () => {
        const originalUserAgent = process.env['npm_config_user_agent']
        try {
          process.env['npm_config_user_agent'] = 'npm/8.0.0 node/v16.0.0 exec'
          expect(isRunningInTemporaryExecutor()).toBe(true)
        } finally {
          process.env['npm_config_user_agent'] = originalUserAgent
        }
      })

      it('should return true when npm_config_user_agent contains "npx"', () => {
        const originalUserAgent = process.env['npm_config_user_agent']
        try {
          process.env['npm_config_user_agent'] = 'npx/8.0.0 node/v16.0.0'
          expect(isRunningInTemporaryExecutor()).toBe(true)
        } finally {
          process.env['npm_config_user_agent'] = originalUserAgent
        }
      })

      it('should return true when npm_config_user_agent contains "dlx"', () => {
        const originalUserAgent = process.env['npm_config_user_agent']
        try {
          process.env['npm_config_user_agent'] = 'pnpm/7.0.0 node/v16.0.0 dlx'
          expect(isRunningInTemporaryExecutor()).toBe(true)
        } finally {
          process.env['npm_config_user_agent'] = originalUserAgent
        }
      })

      it('should return false when npm_config_user_agent is undefined', () => {
        const originalUserAgent = process.env['npm_config_user_agent']
        try {
          delete process.env['npm_config_user_agent']
          expect(isRunningInTemporaryExecutor()).toBe(false)
        } finally {
          process.env['npm_config_user_agent'] = originalUserAgent
        }
      })

      it('should return false when npm_config_user_agent has no exec/npx/dlx', () => {
        const originalUserAgent = process.env['npm_config_user_agent']
        try {
          process.env['npm_config_user_agent'] = 'npm/8.0.0 node/v16.0.0'
          expect(isRunningInTemporaryExecutor()).toBe(false)
        } finally {
          process.env['npm_config_user_agent'] = originalUserAgent
        }
      })
    })

    describe('npm cache detection', () => {
      it('should return true when cwd is inside npm_config_cache', () => {
        const originalCache = process.env['npm_config_cache']
        const originalUserAgent = process.env['npm_config_user_agent']
        try {
          delete process.env['npm_config_user_agent']
          process.env['npm_config_cache'] = '/home/user/.npm'
          expect(
            isRunningInTemporaryExecutor('/home/user/.npm/_npx/12345'),
          ).toBe(true)
        } finally {
          process.env['npm_config_cache'] = originalCache
          process.env['npm_config_user_agent'] = originalUserAgent
        }
      })

      it('should return false when cwd is not inside npm_config_cache', () => {
        const originalCache = process.env['npm_config_cache']
        const originalUserAgent = process.env['npm_config_user_agent']
        try {
          delete process.env['npm_config_user_agent']
          process.env['npm_config_cache'] = '/home/user/.npm'
          expect(isRunningInTemporaryExecutor('/home/user/projects')).toBe(
            false,
          )
        } finally {
          process.env['npm_config_cache'] = originalCache
          process.env['npm_config_user_agent'] = originalUserAgent
        }
      })

      it('should return false when npm_config_cache is undefined', () => {
        const originalCache = process.env['npm_config_cache']
        const originalUserAgent = process.env['npm_config_user_agent']
        try {
          delete process.env['npm_config_user_agent']
          delete process.env['npm_config_cache']
          expect(isRunningInTemporaryExecutor('/home/user/.npm')).toBe(false)
        } finally {
          process.env['npm_config_cache'] = originalCache
          process.env['npm_config_user_agent'] = originalUserAgent
        }
      })

      it('should normalize paths when checking npm cache', () => {
        const originalCache = process.env['npm_config_cache']
        const originalUserAgent = process.env['npm_config_user_agent']
        try {
          delete process.env['npm_config_user_agent']
          process.env['npm_config_cache'] = '/home/user/.npm'
          expect(
            isRunningInTemporaryExecutor('/home/user/.npm/./some/../path'),
          ).toBe(true)
        } finally {
          process.env['npm_config_cache'] = originalCache
          process.env['npm_config_user_agent'] = originalUserAgent
        }
      })
    })

    describe('temporary path pattern detection', () => {
      it('should return true when cwd contains _npx', () => {
        const originalUserAgent = process.env['npm_config_user_agent']
        const originalCache = process.env['npm_config_cache']
        try {
          delete process.env['npm_config_user_agent']
          delete process.env['npm_config_cache']
          expect(isRunningInTemporaryExecutor('/tmp/_npx/12345')).toBe(true)
        } finally {
          process.env['npm_config_user_agent'] = originalUserAgent
          process.env['npm_config_cache'] = originalCache
        }
      })

      it('should return true when cwd contains .pnpm-store', () => {
        const originalUserAgent = process.env['npm_config_user_agent']
        const originalCache = process.env['npm_config_cache']
        try {
          delete process.env['npm_config_user_agent']
          delete process.env['npm_config_cache']
          expect(
            isRunningInTemporaryExecutor('/home/user/.pnpm-store/v3/tmp'),
          ).toBe(true)
        } finally {
          process.env['npm_config_user_agent'] = originalUserAgent
          process.env['npm_config_cache'] = originalCache
        }
      })

      it('should return true when cwd contains dlx-', () => {
        const originalUserAgent = process.env['npm_config_user_agent']
        const originalCache = process.env['npm_config_cache']
        try {
          delete process.env['npm_config_user_agent']
          delete process.env['npm_config_cache']
          expect(isRunningInTemporaryExecutor('/tmp/dlx-package-12345')).toBe(
            true,
          )
        } finally {
          process.env['npm_config_user_agent'] = originalUserAgent
          process.env['npm_config_cache'] = originalCache
        }
      })

      it('should return true when cwd contains .yarn/$$', () => {
        const originalUserAgent = process.env['npm_config_user_agent']
        const originalCache = process.env['npm_config_cache']
        try {
          delete process.env['npm_config_user_agent']
          delete process.env['npm_config_cache']
          expect(
            isRunningInTemporaryExecutor('/project/.yarn/$$/virtual/package'),
          ).toBe(true)
        } finally {
          process.env['npm_config_user_agent'] = originalUserAgent
          process.env['npm_config_cache'] = originalCache
        }
      })

      it('should return false when cwd has no temporary patterns', () => {
        const originalUserAgent = process.env['npm_config_user_agent']
        const originalCache = process.env['npm_config_cache']
        try {
          delete process.env['npm_config_user_agent']
          delete process.env['npm_config_cache']
          expect(isRunningInTemporaryExecutor('/home/user/projects')).toBe(
            false,
          )
        } finally {
          process.env['npm_config_user_agent'] = originalUserAgent
          process.env['npm_config_cache'] = originalCache
        }
      })
    })

    describe('Windows-specific patterns', () => {
      it('should include Windows xfs- pattern on win32 platform', () => {
        const originalUserAgent = process.env['npm_config_user_agent']
        const originalCache = process.env['npm_config_cache']
        const originalPlatform = process.platform
        try {
          delete process.env['npm_config_user_agent']
          delete process.env['npm_config_cache']
          // On Windows platforms, this pattern should be checked.
          if (process.platform === 'win32') {
            expect(
              isRunningInTemporaryExecutor(
                'C:/Users/user/AppData/Local/Temp/xfs-12345',
              ),
            ).toBe(true)
          }
        } finally {
          process.env['npm_config_user_agent'] = originalUserAgent
          process.env['npm_config_cache'] = originalCache
          Object.defineProperty(process, 'platform', {
            value: originalPlatform,
          })
        }
      })

      it('should not match Windows xfs- pattern on non-Windows', () => {
        const originalUserAgent = process.env['npm_config_user_agent']
        const originalCache = process.env['npm_config_cache']
        try {
          delete process.env['npm_config_user_agent']
          delete process.env['npm_config_cache']
          // On non-Windows platforms, this pattern should not be checked.
          if (process.platform !== 'win32') {
            expect(
              isRunningInTemporaryExecutor('/tmp/AppData/Local/Temp/xfs-12345'),
            ).toBe(false)
          }
        } finally {
          process.env['npm_config_user_agent'] = originalUserAgent
          process.env['npm_config_cache'] = originalCache
        }
      })
    })

    describe('path normalization', () => {
      it('should normalize cwd before checking patterns', () => {
        const originalUserAgent = process.env['npm_config_user_agent']
        const originalCache = process.env['npm_config_cache']
        try {
          delete process.env['npm_config_user_agent']
          delete process.env['npm_config_cache']
          expect(
            isRunningInTemporaryExecutor('/tmp/_npx/./12345/../67890'),
          ).toBe(true)
        } finally {
          process.env['npm_config_user_agent'] = originalUserAgent
          process.env['npm_config_cache'] = originalCache
        }
      })

      it('should handle paths with redundant slashes', () => {
        const originalUserAgent = process.env['npm_config_user_agent']
        const originalCache = process.env['npm_config_cache']
        try {
          delete process.env['npm_config_user_agent']
          delete process.env['npm_config_cache']
          expect(isRunningInTemporaryExecutor('/tmp//_npx//12345')).toBe(true)
        } finally {
          process.env['npm_config_user_agent'] = originalUserAgent
          process.env['npm_config_cache'] = originalCache
        }
      })
    })

    describe('default cwd behavior', () => {
      it('should use process.cwd() when no cwd argument provided', () => {
        const originalUserAgent = process.env['npm_config_user_agent']
        const originalCache = process.env['npm_config_cache']
        try {
          delete process.env['npm_config_user_agent']
          delete process.env['npm_config_cache']
          const result = isRunningInTemporaryExecutor()
          expect(typeof result).toBe('boolean')
        } finally {
          process.env['npm_config_user_agent'] = originalUserAgent
          process.env['npm_config_cache'] = originalCache
        }
      })

      it('should return false for normal project directories', () => {
        const originalUserAgent = process.env['npm_config_user_agent']
        const originalCache = process.env['npm_config_cache']
        try {
          delete process.env['npm_config_user_agent']
          delete process.env['npm_config_cache']
          expect(isRunningInTemporaryExecutor('/home/user/my-project')).toBe(
            false,
          )
        } finally {
          process.env['npm_config_user_agent'] = originalUserAgent
          process.env['npm_config_cache'] = originalCache
        }
      })
    })

    describe('combined scenarios', () => {
      it('should return true when both user agent and path pattern match', () => {
        const originalUserAgent = process.env['npm_config_user_agent']
        try {
          process.env['npm_config_user_agent'] = 'npx/8.0.0'
          expect(isRunningInTemporaryExecutor('/tmp/_npx/12345')).toBe(true)
        } finally {
          process.env['npm_config_user_agent'] = originalUserAgent
        }
      })

      it('should return true when user agent matches but path does not', () => {
        const originalUserAgent = process.env['npm_config_user_agent']
        try {
          process.env['npm_config_user_agent'] = 'npx/8.0.0'
          expect(isRunningInTemporaryExecutor('/home/user/project')).toBe(true)
        } finally {
          process.env['npm_config_user_agent'] = originalUserAgent
        }
      })

      it('should return true when path matches but user agent does not', () => {
        const originalUserAgent = process.env['npm_config_user_agent']
        const originalCache = process.env['npm_config_cache']
        try {
          process.env['npm_config_user_agent'] = 'npm/8.0.0'
          delete process.env['npm_config_cache']
          expect(isRunningInTemporaryExecutor('/tmp/_npx/12345')).toBe(true)
        } finally {
          process.env['npm_config_user_agent'] = originalUserAgent
          process.env['npm_config_cache'] = originalCache
        }
      })

      it('should return false when neither user agent nor path match', () => {
        const originalUserAgent = process.env['npm_config_user_agent']
        const originalCache = process.env['npm_config_cache']
        try {
          process.env['npm_config_user_agent'] = 'npm/8.0.0'
          delete process.env['npm_config_cache']
          expect(isRunningInTemporaryExecutor('/home/user/project')).toBe(false)
        } finally {
          process.env['npm_config_user_agent'] = originalUserAgent
          process.env['npm_config_cache'] = originalCache
        }
      })
    })

    describe('edge cases', () => {
      it('should handle empty cwd string', () => {
        const originalUserAgent = process.env['npm_config_user_agent']
        const originalCache = process.env['npm_config_cache']
        try {
          delete process.env['npm_config_user_agent']
          delete process.env['npm_config_cache']
          expect(isRunningInTemporaryExecutor('')).toBe(false)
        } finally {
          process.env['npm_config_user_agent'] = originalUserAgent
          process.env['npm_config_cache'] = originalCache
        }
      })

      it('should handle root path', () => {
        const originalUserAgent = process.env['npm_config_user_agent']
        const originalCache = process.env['npm_config_cache']
        try {
          delete process.env['npm_config_user_agent']
          delete process.env['npm_config_cache']
          expect(isRunningInTemporaryExecutor('/')).toBe(false)
        } finally {
          process.env['npm_config_user_agent'] = originalUserAgent
          process.env['npm_config_cache'] = originalCache
        }
      })

      it('should handle paths with similar but not matching patterns', () => {
        const originalUserAgent = process.env['npm_config_user_agent']
        const originalCache = process.env['npm_config_cache']
        try {
          delete process.env['npm_config_user_agent']
          delete process.env['npm_config_cache']
          expect(isRunningInTemporaryExecutor('/home/npx-user/project')).toBe(
            false,
          )
          // Contains "dlx-".
          expect(isRunningInTemporaryExecutor('/home/user/dlx-not-temp')).toBe(
            true,
          )
        } finally {
          process.env['npm_config_user_agent'] = originalUserAgent
          process.env['npm_config_cache'] = originalCache
        }
      })

      it('should handle nested temporary paths', () => {
        const originalUserAgent = process.env['npm_config_user_agent']
        const originalCache = process.env['npm_config_cache']
        try {
          delete process.env['npm_config_user_agent']
          delete process.env['npm_config_cache']
          expect(
            isRunningInTemporaryExecutor('/tmp/_npx/node_modules/.pnpm-store'),
          ).toBe(true)
        } finally {
          process.env['npm_config_user_agent'] = originalUserAgent
          process.env['npm_config_cache'] = originalCache
        }
      })

      it('should handle user agent with multiple keywords', () => {
        const originalUserAgent = process.env['npm_config_user_agent']
        try {
          process.env['npm_config_user_agent'] =
            'npm/8.0.0 node/v16.0.0 exec npx dlx'
          expect(isRunningInTemporaryExecutor()).toBe(true)
        } finally {
          process.env['npm_config_user_agent'] = originalUserAgent
        }
      })

      it('should be case-sensitive for path patterns', () => {
        const originalUserAgent = process.env['npm_config_user_agent']
        const originalCache = process.env['npm_config_cache']
        try {
          delete process.env['npm_config_user_agent']
          delete process.env['npm_config_cache']
          expect(isRunningInTemporaryExecutor('/tmp/_NPX/12345')).toBe(false)
          expect(isRunningInTemporaryExecutor('/tmp/DLX-12345')).toBe(false)
        } finally {
          process.env['npm_config_user_agent'] = originalUserAgent
          process.env['npm_config_cache'] = originalCache
        }
      })
    })

    describe('real-world scenarios', () => {
      it('should detect npx execution in npm cache', () => {
        const originalUserAgent = process.env['npm_config_user_agent']
        const originalCache = process.env['npm_config_cache']
        try {
          process.env['npm_config_user_agent'] = 'npx/10.2.3 node/v20.0.0'
          process.env['npm_config_cache'] = '/home/user/.npm'
          expect(
            isRunningInTemporaryExecutor(
              '/home/user/.npm/_npx/abc123/node_modules/package',
            ),
          ).toBe(true)
        } finally {
          process.env['npm_config_user_agent'] = originalUserAgent
          process.env['npm_config_cache'] = originalCache
        }
      })

      it('should detect pnpm dlx execution', () => {
        const originalUserAgent = process.env['npm_config_user_agent']
        try {
          process.env['npm_config_user_agent'] = 'pnpm/8.0.0 node/v20.0.0 dlx'
          expect(
            isRunningInTemporaryExecutor('/tmp/pnpm-dlx-12345/package'),
          ).toBe(true)
        } finally {
          process.env['npm_config_user_agent'] = originalUserAgent
        }
      })

      it('should detect yarn dlx execution with PnP', () => {
        const originalUserAgent = process.env['npm_config_user_agent']
        const originalCache = process.env['npm_config_cache']
        try {
          delete process.env['npm_config_user_agent']
          delete process.env['npm_config_cache']
          expect(
            isRunningInTemporaryExecutor(
              '/project/.yarn/$$/virtual/package-abc/0/package',
            ),
          ).toBe(true)
        } finally {
          process.env['npm_config_user_agent'] = originalUserAgent
          process.env['npm_config_cache'] = originalCache
        }
      })

      it('should not detect normal npm install', () => {
        const originalUserAgent = process.env['npm_config_user_agent']
        const originalCache = process.env['npm_config_cache']
        try {
          process.env['npm_config_user_agent'] = 'npm/10.2.3 node/v20.0.0'
          delete process.env['npm_config_cache']
          expect(
            isRunningInTemporaryExecutor('/home/user/project/node_modules'),
          ).toBe(false)
        } finally {
          process.env['npm_config_user_agent'] = originalUserAgent
          process.env['npm_config_cache'] = originalCache
        }
      })

      it('should not detect normal project development', () => {
        const originalUserAgent = process.env['npm_config_user_agent']
        const originalCache = process.env['npm_config_cache']
        try {
          delete process.env['npm_config_user_agent']
          delete process.env['npm_config_cache']
          expect(
            isRunningInTemporaryExecutor('/home/user/projects/my-app'),
          ).toBe(false)
        } finally {
          process.env['npm_config_user_agent'] = originalUserAgent
          process.env['npm_config_cache'] = originalCache
        }
      })
    })
  })
})
