import path from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  findRealBin,
  findRealNpm,
  findRealPnpm,
  findRealYarn,
  isShadowBinPath,
  resolveBinPathSync,
  whichBinSync,
} from '../../registry/dist/lib/bin.js'

describe('bin module - function utilities', () => {
  describe('isShadowBinPath', () => {
    it('should identify shadow bin paths with forward slashes', () => {
      const result = isShadowBinPath('/project/node_modules/.bin')
      expect(result).toBe(true)
    })

    it('should identify shadow bin paths with backslashes', () => {
      const result = isShadowBinPath('C:\\project\\node_modules\\.bin')
      expect(result).toBe(true)
    })

    it('should identify nested shadow bin paths', () => {
      const result = isShadowBinPath(
        '/home/user/project/node_modules/.bin/subdir',
      )
      expect(result).toBe(true)
    })

    it('should handle undefined path', () => {
      const result = isShadowBinPath(undefined)
      expect(result).toBe(false)
    })

    it('should return false for empty string', () => {
      const result = isShadowBinPath('')
      expect(result).toBe(false)
    })

    it('should return false for regular paths', () => {
      const result = isShadowBinPath('/usr/local/bin')
      expect(result).toBe(false)
    })

    it('should return false for paths with .bin but not in node_modules', () => {
      const result = isShadowBinPath('/home/user/.bin')
      expect(result).toBe(false)
    })

    it('should return false for paths with node_modules but not .bin', () => {
      const result = isShadowBinPath('/home/user/node_modules/package')
      expect(result).toBe(false)
    })
  })

  describe('whichBinSync', () => {
    it('should find npm bin', () => {
      const result = whichBinSync('npm')
      expect(typeof result).toBe('string')
    })

    it('should handle non-existent bins', () => {
      const result = whichBinSync('nonexistent-binary-xyz')
      expect(result).toBe(undefined)
    })

    it('should find node bin', () => {
      const result = whichBinSync('node')
      expect(typeof result).toBe('string')
    })
  })

  describe('resolveBinPathSync', () => {
    it('should resolve npm path', () => {
      const npmPaths = whichBinSync('npm')
      const npmPath = Array.isArray(npmPaths) ? npmPaths[0] : npmPaths
      if (npmPath) {
        const result = resolveBinPathSync(npmPath)
        expect(typeof result).toBe('string')
        expect(path.isAbsolute(result)).toBe(true)
      }
    })

    it('should handle absolute paths', () => {
      const result = resolveBinPathSync(
        path.join(path.sep, 'usr', 'bin', 'node'),
      )
      expect(typeof result).toBe('string')
    })
  })

  describe('findRealBin', () => {
    it('should find real bin for npm', () => {
      const result = findRealBin('npm')
      expect(typeof result).toBe('string')
    })

    it('should find real bin for node', () => {
      const result = findRealBin('node')
      expect(typeof result).toBe('string')
    })

    it('should handle bin with common paths', () => {
      const result = findRealBin('npm', [
        path.join(path.sep, 'usr', 'bin', 'npm'),
      ])
      expect(typeof result).toBe('string')
    })
  })

  describe('findRealNpm', () => {
    it('should find real npm binary', () => {
      const result = findRealNpm()
      expect(typeof result).toBe('string')
      expect(result.length).toBeGreaterThan(0)
    })

    it('should return absolute path', () => {
      const result = findRealNpm()
      expect(path.isAbsolute(result)).toBe(true)
    })
  })

  describe('findRealPnpm', () => {
    it('should find real pnpm binary', () => {
      const result = findRealPnpm()
      expect(typeof result).toBe('string')
    })

    it('should return absolute path if pnpm exists', () => {
      const result = findRealPnpm()
      if (result) {
        expect(path.isAbsolute(result)).toBe(true)
      }
    })
  })

  describe('findRealYarn', () => {
    it('should find real yarn binary', () => {
      const result = findRealYarn()
      expect(typeof result).toBe('string')
    })

    it('should return absolute path if yarn exists', () => {
      const result = findRealYarn()
      if (result) {
        expect(path.isAbsolute(result)).toBe(true)
      }
    })
  })
})
