import path from 'node:path'

import { describe, expect, it } from 'vitest'

import bunCachePath from '../../registry/dist/lib/constants/bun-cache-path.js'

describe('bun-cache-path', () => {
  it('should export a string', () => {
    expect(typeof bunCachePath).toBe('string')
  })

  it('should contain expected keyword when path is set', () => {
    if (bunCachePath) {
      expect(bunCachePath.toLowerCase()).toContain('bun')
    }
  })

  it('should not contain backslashes in normalized path', () => {
    if (bunCachePath) {
      expect(bunCachePath).not.toContain('\\')
    }
  })

  it('should be a valid absolute path when set', () => {
    if (bunCachePath) {
      expect(path.isAbsolute(bunCachePath)).toBe(true)
    }
  })

  describe('platform-specific paths', () => {
    if (process.platform === 'darwin') {
      it('should contain Library/Caches on macOS', () => {
        if (bunCachePath) {
          expect(bunCachePath).toContain('Library')
          expect(bunCachePath).toContain('Caches')
        }
      })
    } else if (process.platform === 'win32') {
      it('should contain expected temp path on Windows', () => {
        if (bunCachePath) {
          const temp = process.env['TEMP'] || process.env['TMP']
          if (temp) {
            expect(bunCachePath.toLowerCase()).toContain('temp')
          }
        }
      })
    } else {
      it('should contain .bun/install/cache on Linux', () => {
        if (bunCachePath) {
          expect(bunCachePath).toContain('.bun')
          expect(bunCachePath).toContain('install')
          expect(bunCachePath).toContain('cache')
        }
      })
    }
  })
})
