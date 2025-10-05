import os from 'node:os'
import path from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { isRunningInTemporaryExecutor } from '../../registry/dist/lib/temporary-executor.js'

describe('isRunningInTemporaryExecutor', () => {
  const originalEnv = process.env

  beforeEach(() => {
    // Clear environment variables that affect detection.
    delete process.env['npm_config_user_agent']
    delete process.env['npm_config_cache']
  })

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  describe('environment variable detection', () => {
    it('should detect npx from npm_config_user_agent', () => {
      process.env['npm_config_user_agent'] = 'npm/8.0.0 npx/8.0.0 node/18.0.0'
      const result = isRunningInTemporaryExecutor()
      expect(result).toBe(true)
    })

    it('should detect exec from npm_config_user_agent', () => {
      process.env['npm_config_user_agent'] = 'npm/8.0.0 exec node/18.0.0'
      const result = isRunningInTemporaryExecutor()
      expect(result).toBe(true)
    })

    it('should detect pnpm dlx from npm_config_user_agent', () => {
      process.env['npm_config_user_agent'] = 'pnpm/8.0.0 dlx node/18.0.0'
      const result = isRunningInTemporaryExecutor()
      expect(result).toBe(true)
    })

    it('should detect yarn dlx from npm_config_user_agent', () => {
      process.env['npm_config_user_agent'] = 'yarn/3.0.0 dlx node/18.0.0'
      const result = isRunningInTemporaryExecutor()
      expect(result).toBe(true)
    })

    it('should not detect temporary executor without indicators', () => {
      process.env['npm_config_user_agent'] = 'npm/8.0.0 node/18.0.0'
      const result = isRunningInTemporaryExecutor()
      expect(result).toBe(false)
    })
  })

  describe('npm cache detection', () => {
    it('should detect npm cache directory from npm_config_cache', () => {
      const cacheDir = path.join(os.tmpdir(), '_npx', 'test')
      process.env['npm_config_cache'] = cacheDir
      const result = isRunningInTemporaryExecutor(
        path.join(cacheDir, 'some-package'),
      )
      expect(result).toBe(true)
    })

    it('should not detect when cwd is outside npm cache', () => {
      process.env['npm_config_cache'] = '/some/cache/dir'
      const result = isRunningInTemporaryExecutor('/different/dir')
      expect(result).toBe(false)
    })
  })

  describe('path pattern detection', () => {
    it('should detect _npx pattern in path', () => {
      const result = isRunningInTemporaryExecutor(
        path.join(os.tmpdir(), '_npx', '12345', 'package'),
      )
      expect(result).toBe(true)
    })

    it('should detect .pnpm-store pattern in path', () => {
      const result = isRunningInTemporaryExecutor('/tmp/.pnpm-store/v3/tmp')
      expect(result).toBe(true)
    })

    it('should detect dlx- pattern in path', () => {
      const result = isRunningInTemporaryExecutor('/tmp/dlx-12345/package')
      expect(result).toBe(true)
    })

    it('should detect yarn PnP virtual packages', () => {
      const result = isRunningInTemporaryExecutor(
        '/project/.yarn/$$/some-package',
      )
      expect(result).toBe(true)
    })

    it('should detect Yarn on Windows pattern', () => {
      if (path.sep === '\\') {
        const result = isRunningInTemporaryExecutor(
          'C:\\Users\\Test\\AppData\\Local\\Temp\\xfs-12345',
        )
        expect(result).toBe(true)
      } else {
        const result = isRunningInTemporaryExecutor(
          '/Users/Test/AppData/Local/Temp/xfs-12345',
        )
        expect(result).toBe(true)
      }
    })

    it('should not detect regular project paths', () => {
      const result = isRunningInTemporaryExecutor('/home/user/projects/myapp')
      expect(result).toBe(false)
    })

    it('should not detect node_modules paths', () => {
      const result = isRunningInTemporaryExecutor(
        '/home/user/projects/myapp/node_modules/some-package',
      )
      expect(result).toBe(false)
    })
  })

  describe('edge cases', () => {
    it('should handle paths with mixed separators', () => {
      const result = isRunningInTemporaryExecutor('/tmp/_npx/12345/package')
      expect(result).toBe(true)
    })

    it('should handle relative paths', () => {
      const result = isRunningInTemporaryExecutor('_npx/12345/package')
      expect(result).toBe(true)
    })

    it('should use process.cwd() by default', () => {
      const result = isRunningInTemporaryExecutor()
      expect(typeof result).toBe('boolean')
    })

    it('should handle empty path', () => {
      const result = isRunningInTemporaryExecutor('')
      expect(result).toBe(false)
    })
  })

  describe('cross-platform compatibility', () => {
    it('should normalize paths on all platforms', () => {
      const windowsPath = 'C:\\tmp\\_npx\\12345'
      const result = isRunningInTemporaryExecutor(windowsPath)
      expect(typeof result).toBe('boolean')
    })

    it('should work with Unix paths', () => {
      const unixPath = '/tmp/_npx/12345'
      const result = isRunningInTemporaryExecutor(unixPath)
      expect(result).toBe(true)
    })
  })
})
