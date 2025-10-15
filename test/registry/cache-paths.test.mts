import { describe, expect, it } from 'vitest'

import bunCachePath from '../../registry/dist/lib/constants/bun-cache-path.js'
import pacoteCachePath from '../../registry/dist/lib/constants/pacote-cache-path.js'
import pnpmStorePath from '../../registry/dist/lib/constants/pnpm-store-path.js'
import vltCachePath from '../../registry/dist/lib/constants/vlt-cache-path.js'
import yarnCachePath from '../../registry/dist/lib/constants/yarn-cache-path.js'

describe('package manager cache paths', () => {
  const cachePaths = [
    { name: 'bunCachePath', value: bunCachePath, keyword: 'bun' },
    { name: 'pacoteCachePath', value: pacoteCachePath, keyword: '_cacache' },
    { name: 'pnpmStorePath', value: pnpmStorePath, keyword: 'pnpm' },
    { name: 'vltCachePath', value: vltCachePath, keyword: 'vlt' },
    { name: 'yarnCachePath', value: yarnCachePath, keyword: 'yarn' },
  ]

  it('should export all cache paths as strings', () => {
    for (const { value } of cachePaths) {
      expect(typeof value).toBe('string')
    }
  })

  it('should contain expected keywords when paths are set', () => {
    for (const { keyword, value } of cachePaths) {
      if (value) {
        // Use case-insensitive matching for Windows compatibility
        // (e.g., Windows uses 'Yarn' not 'yarn' in paths)
        expect(value.toLowerCase()).toContain(keyword.toLowerCase())
      }
    }
  })

  it('should not contain backslashes in normalized paths', () => {
    for (const { value } of cachePaths) {
      if (value) {
        expect(value).not.toContain('\\')
      }
    }
  })

  describe('platform-specific behavior', () => {
    it('should handle missing HOME on Unix systems', () => {
      if (process.platform !== 'win32' && !process.env['HOME']) {
        expect(bunCachePath).toBe('')
        expect(pnpmStorePath).toBe('')
        expect(vltCachePath).toBe('')
        expect(yarnCachePath).toBe('')
      }
    })

    it('should handle missing LOCALAPPDATA on Windows', () => {
      if (process.platform === 'win32' && !process.env['LOCALAPPDATA']) {
        expect(pnpmStorePath).toBe('')
        expect(vltCachePath).toBe('')
        expect(yarnCachePath).toBe('')
      }
    })

    it('should respect XDG environment variables on Linux', () => {
      if (process.platform === 'linux') {
        if (process.env['XDG_CACHE_HOME'] && vltCachePath) {
          expect(vltCachePath).toContain('vlt')
        }
        if (process.env['XDG_DATA_HOME'] && pnpmStorePath) {
          expect(pnpmStorePath).toContain('pnpm')
          expect(pnpmStorePath).toContain('store')
        }
      }
    })
  })
})
