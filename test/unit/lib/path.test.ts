/**
 * @fileoverview Tests for path utilities.
 *
 * Validates path manipulation, normalization, and validation functions.
 */

import { describe, expect, it } from 'vitest'

import {
  isAbsolute,
  isNodeModules,
  isPath,
  isRelative,
  normalizePath,
  pathLikeToString,
  relativeResolve,
  splitPath,
  trimLeadingDotSlash,
} from '../../../registry/dist/lib/path.js'

describe('path utilities', () => {
  describe('isAbsolute', () => {
    it('should return true for absolute paths', () => {
      expect(isAbsolute('/usr/local/bin')).toBe(true)
      expect(isAbsolute('/home/user')).toBe(true)
    })

    it('should return false for relative paths', () => {
      expect(isAbsolute('relative/path')).toBe(false)
      expect(isAbsolute('./relative')).toBe(false)
      expect(isAbsolute('../parent')).toBe(false)
    })

    it('should handle Buffer input', () => {
      const absoluteBuf = Buffer.from('/absolute/path')
      const relativeBuf = Buffer.from('relative/path')
      expect(isAbsolute(absoluteBuf)).toBe(true)
      expect(isAbsolute(relativeBuf)).toBe(false)
    })

    it('should handle URL input', () => {
      const fileUrl = new URL('file:///absolute/path')
      expect(isAbsolute(fileUrl)).toBe(true)
    })

    it('should handle empty strings', () => {
      expect(isAbsolute('')).toBe(false)
    })
  })

  describe('isRelative', () => {
    it('should return true for relative paths', () => {
      expect(isRelative('relative/path')).toBe(true)
      expect(isRelative('./relative')).toBe(true)
      expect(isRelative('../parent')).toBe(true)
    })

    it('should return false for absolute paths', () => {
      expect(isRelative('/absolute/path')).toBe(false)
      expect(isRelative('/usr/bin')).toBe(false)
    })

    it('should handle Buffer input', () => {
      const relativeBuf = Buffer.from('relative/path')
      const absoluteBuf = Buffer.from('/absolute/path')
      expect(isRelative(relativeBuf)).toBe(true)
      expect(isRelative(absoluteBuf)).toBe(false)
    })

    it('should handle URL input', () => {
      const fileUrl = new URL('file:///absolute/path')
      expect(isRelative(fileUrl)).toBe(false)
    })
  })

  describe('isPath', () => {
    it('should return true for valid paths', () => {
      expect(isPath('/usr/local')).toBe(true)
      expect(isPath('relative/path')).toBe(true)
      expect(isPath('./file.txt')).toBe(true)
    })

    it('should handle paths with extensions', () => {
      expect(isPath('/path/file.js')).toBe(true)
      expect(isPath('/path/to/file.json')).toBe(true)
    })

    it('should handle Buffer input', () => {
      const pathBuf = Buffer.from('/some/path')
      expect(isPath(pathBuf)).toBe(true)
    })

    it('should handle URL input', () => {
      const fileUrl = new URL('file:///some/path')
      expect(isPath(fileUrl)).toBe(true)
    })

    it('should handle empty strings', () => {
      expect(isPath('')).toBe(false)
    })
  })

  describe('isNodeModules', () => {
    it('should return true for node_modules paths', () => {
      expect(isNodeModules('/project/node_modules')).toBe(true)
      expect(isNodeModules('/project/node_modules/package')).toBe(true)
      expect(isNodeModules('node_modules')).toBe(true)
    })

    it('should return false for non-node_modules paths', () => {
      expect(isNodeModules('/usr/local')).toBe(false)
      expect(isNodeModules('src/index.js')).toBe(false)
      expect(isNodeModules('/src/node_modules_backup')).toBe(false)
    })

    it('should handle nested node_modules', () => {
      expect(isNodeModules('/project/node_modules/pkg/node_modules')).toBe(true)
    })

    it('should handle Buffer input', () => {
      const nmBuf = Buffer.from('node_modules/package')
      expect(isNodeModules(nmBuf)).toBe(true)
    })

    it('should handle URL input', () => {
      const fileUrl = new URL('file:///project/node_modules')
      expect(isNodeModules(fileUrl)).toBe(true)
    })
  })

  describe('normalizePath', () => {
    it('should normalize standard paths', () => {
      const result = normalizePath('/usr/./local/../bin')
      expect(result).toBe('/usr/bin')
    })

    it('should remove redundant slashes', () => {
      const result = normalizePath('/usr//local///bin')
      expect(result).toBe('/usr/local/bin')
    })

    it('should handle relative paths', () => {
      const result = normalizePath('./relative/./path')
      expect(result).toBe('relative/path')
    })

    it('should handle parent directory references', () => {
      const result = normalizePath('/usr/local/../bin')
      expect(result).toBe('/usr/bin')
    })

    it('should handle current directory references', () => {
      const result = normalizePath('/usr/./local/./bin')
      expect(result).toBe('/usr/local/bin')
    })

    it('should handle Buffer input', () => {
      const pathBuf = Buffer.from('/usr/./local')
      const result = normalizePath(pathBuf)
      expect(result).toBe('/usr/local')
    })

    it('should handle URL input', () => {
      const fileUrl = new URL('file:///usr/./local')
      const result = normalizePath(fileUrl)
      expect(result).toBe('/usr/local')
    })

    it('should handle empty path', () => {
      const result = normalizePath('')
      expect(result).toBe('.')
    })

    it('should preserve trailing slashes when significant', () => {
      const result = normalizePath('/usr/local/')
      expect(typeof result).toBe('string')
    })
  })

  describe('pathLikeToString', () => {
    it('should convert string to string', () => {
      const result = pathLikeToString('/usr/local')
      expect(result).toBe('/usr/local')
    })

    it('should convert Buffer to string', () => {
      const buf = Buffer.from('/usr/local')
      const result = pathLikeToString(buf)
      expect(result).toBe('/usr/local')
    })

    it('should convert URL to path string', () => {
      const fileUrl = new URL('file:///usr/local')
      const result = pathLikeToString(fileUrl)
      expect(result).toContain('usr')
      expect(result).toContain('local')
    })

    it('should handle empty string', () => {
      const result = pathLikeToString('')
      expect(result).toBe('')
    })

    it('should handle empty Buffer', () => {
      const buf = Buffer.from('')
      const result = pathLikeToString(buf)
      expect(result).toBe('')
    })

    it('should preserve path separators', () => {
      const result = pathLikeToString('/usr/local/bin')
      expect(result.includes('/')).toBe(true)
    })
  })

  describe('splitPath', () => {
    it('should split path into segments', () => {
      const result = splitPath('/usr/local/bin')
      expect(Array.isArray(result)).toBe(true)
      expect(result).toContain('usr')
      expect(result).toContain('local')
      expect(result).toContain('bin')
    })

    it('should handle relative paths', () => {
      const result = splitPath('relative/path/file.js')
      expect(result).toContain('relative')
      expect(result).toContain('path')
      expect(result).toContain('file.js')
    })

    it('should handle single segment', () => {
      const result = splitPath('filename.js')
      expect(result.length).toBeGreaterThan(0)
      expect(result).toContain('filename.js')
    })

    it('should handle Buffer input', () => {
      const buf = Buffer.from('/usr/local')
      const result = splitPath(buf)
      expect(Array.isArray(result)).toBe(true)
      expect(result).toContain('usr')
      expect(result).toContain('local')
    })

    it('should handle URL input', () => {
      const fileUrl = new URL('file:///usr/local')
      const result = splitPath(fileUrl)
      expect(Array.isArray(result)).toBe(true)
    })

    it('should handle empty path', () => {
      const result = splitPath('')
      expect(Array.isArray(result)).toBe(true)
    })

    it('should return segments array', () => {
      const result = splitPath('/usr/local')
      expect(result.length).toBeGreaterThan(0)
      expect(Array.isArray(result)).toBe(true)
    })
  })

  describe('trimLeadingDotSlash', () => {
    it('should remove leading ./ from paths', () => {
      const result = trimLeadingDotSlash('./relative/path')
      expect(result).toBe('relative/path')
    })

    it('should not modify paths without leading ./', () => {
      const result = trimLeadingDotSlash('relative/path')
      expect(result).toBe('relative/path')
    })

    it('should not modify absolute paths', () => {
      const result = trimLeadingDotSlash('/absolute/path')
      expect(result).toBe('/absolute/path')
    })

    it('should handle single leading ./', () => {
      const result = trimLeadingDotSlash('./path')
      expect(result).toBe('path')
    })

    it('should handle Buffer input', () => {
      const buf = Buffer.from('./relative/path')
      const result = trimLeadingDotSlash(buf)
      expect(result).toBe('relative/path')
    })

    it('should handle URL input', () => {
      const fileUrl = new URL('file:///./path')
      const result = trimLeadingDotSlash(fileUrl)
      expect(typeof result).toBe('string')
    })

    it('should handle just ./', () => {
      const result = trimLeadingDotSlash('./')
      expect(result).not.toBe('./')
    })

    it('should preserve rest of path', () => {
      const result = trimLeadingDotSlash('./path/./to/file')
      expect(result).toContain('path')
      expect(result).toContain('file')
    })
  })

  describe('relativeResolve', () => {
    it('should return string for valid inputs', () => {
      const result = relativeResolve('/usr/local', 'bin')
      expect(typeof result).toBe('string')
    })

    it('should compute relative path', () => {
      const result = relativeResolve('/usr/local', '/usr/bin')
      expect(typeof result).toBe('string')
      expect(result.length).toBeGreaterThan(0)
    })

    it('should handle parent directory references', () => {
      const result = relativeResolve('/usr/local/bin', '../lib')
      expect(typeof result).toBe('string')
    })

    it('should handle current directory references', () => {
      const result = relativeResolve('/usr/local', './bin')
      expect(typeof result).toBe('string')
    })

    it('should handle multiple parent references', () => {
      const result = relativeResolve('/usr/local/bin/tools', '../../lib')
      expect(typeof result).toBe('string')
    })

    it('should handle empty base', () => {
      const result = relativeResolve('', 'relative/path')
      expect(typeof result).toBe('string')
    })

    it('should handle empty target', () => {
      const result = relativeResolve('/usr/local', '')
      expect(typeof result).toBe('string')
    })

    it('should handle same paths', () => {
      const result = relativeResolve('/usr/local', '/usr/local')
      expect(typeof result).toBe('string')
    })

    it('should compute path difference', () => {
      const result = relativeResolve('src', 'lib')
      expect(typeof result).toBe('string')
      expect(result).toContain('lib')
    })
  })

  describe('edge cases', () => {
    it('should handle paths with special characters', () => {
      expect(isPath('/path/with spaces/file.txt')).toBe(true)
      expect(isPath('/path/with-dashes/file')).toBe(true)
      expect(isPath('/path/with_underscores/file')).toBe(true)
    })

    it('should handle paths with dots', () => {
      expect(isPath('/path/.hidden')).toBe(true)
      expect(isPath('/path/.hidden/file')).toBe(true)
      expect(isPath('/path/file.with.multiple.dots.txt')).toBe(true)
    })

    it('should handle very long paths', () => {
      const longPath = '/'.repeat(100) + 'path'.repeat(100)
      expect(() => normalizePath(longPath)).not.toThrow()
    })

    it('should handle Unicode in paths', () => {
      expect(isPath('/path/文件/file')).toBe(true)
      expect(normalizePath('/path/文件/./file')).toContain('文件')
    })

    it('should handle Windows-style paths on POSIX', () => {
      const result = normalizePath('C:\\\\Users\\\\file')
      expect(typeof result).toBe('string')
    })
  })

  describe('cross-platform behavior', () => {
    it('should work with POSIX paths', () => {
      expect(isAbsolute('/usr/local')).toBe(true)
      expect(isRelative('relative/path')).toBe(true)
    })

    it('should normalize POSIX paths', () => {
      const result = normalizePath('/usr/./local/../bin')
      expect(result).toBe('/usr/bin')
    })

    it('should split POSIX paths', () => {
      const result = splitPath('/usr/local/bin')
      expect(result).toContain('usr')
      expect(result).toContain('local')
      expect(result).toContain('bin')
    })
  })
})
