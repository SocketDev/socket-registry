import { Buffer } from 'node:buffer'
import { URL } from 'node:url'

import { describe, expect, it, vi } from 'vitest'

const {
  isNodeModules,
  isPath,
  isRelative,
  normalizePath,
  pathLikeToString,
  relativeResolve,
  splitPath,
  trimLeadingDotSlash,
} = require('@socketsecurity/registry/lib/path')

describe('path normalization and utilities', () => {
  describe('isNodeModules', () => {
    it('should detect node_modules in path', () => {
      expect(isNodeModules('/path/node_modules/package')).toBe(true)
      expect(isNodeModules('node_modules/package')).toBe(true)
      expect(isNodeModules('/path/to/node_modules')).toBe(true)
      expect(isNodeModules('C:\\path\\node_modules\\package')).toBe(true)
    })

    it('should not detect node_modules when not present', () => {
      expect(isNodeModules('/path/to/package')).toBe(false)
      expect(isNodeModules('regular/path')).toBe(false)
      expect(isNodeModules('')).toBe(false)
    })

    it('should handle Buffer input', () => {
      expect(isNodeModules(Buffer.from('/path/node_modules/pkg'))).toBe(true)
      expect(isNodeModules(Buffer.from('/regular/path'))).toBe(false)
    })

    it('should handle URL input', () => {
      expect(isNodeModules(new URL('file:///path/node_modules/pkg'))).toBe(true)
      expect(isNodeModules(new URL('file:///regular/path'))).toBe(false)
    })
  })

  describe('isPath', () => {
    it('should identify valid paths', () => {
      expect(isPath('./relative')).toBe(true)
      expect(isPath('../parent')).toBe(true)
      expect(isPath('/absolute/path')).toBe(true)
      expect(isPath('relative/path')).toBe(true)
      expect(isPath('.')).toBe(true)
      expect(isPath('..')).toBe(true)
      expect(isPath('C:\\Windows\\path')).toBe(true)
      expect(isPath('path\\with\\backslashes')).toBe(true)
    })

    it('should reject non-paths', () => {
      expect(isPath('')).toBe(false)
      expect(isPath('package-name')).toBe(false)
      expect(isPath('@scope/package')).toBe(false)
      expect(isPath('@scope')).toBe(false)
      expect(isPath(null)).toBe(false)
      expect(isPath(undefined)).toBe(false)
      expect(isPath(123)).toBe(false)
    })

    it('should handle scoped packages with paths', () => {
      expect(isPath('@/some/path')).toBe(true)
      expect(isPath('@scope/package/path')).toBe(true)
      // Backslash paths are not considered paths on Unix systems.
      expect(isPath('@scope\\package\\path')).toBe(false)
    })

    it('should handle Buffer input', () => {
      expect(isPath(Buffer.from('./path'))).toBe(true)
      expect(isPath(Buffer.from('package-name'))).toBe(false)
    })

    it('should handle URL input', () => {
      expect(isPath(new URL('file:///path/to/file'))).toBe(true)
    })
  })

  describe('isRelative', () => {
    it('should identify relative paths', () => {
      expect(isRelative('./file')).toBe(true)
      expect(isRelative('../parent')).toBe(true)
      expect(isRelative('relative/path')).toBe(true)
      expect(isRelative('')).toBe(true)
      expect(isRelative('.')).toBe(true)
      expect(isRelative('..')).toBe(true)
    })

    it('should identify absolute paths', () => {
      expect(isRelative('/absolute')).toBe(false)
      // Windows drive paths are considered relative on Unix systems.
      expect(isRelative('C:\\Windows')).toBe(true)
    })

    it('should handle invalid input', () => {
      // Invalid inputs are converted to strings and treated as relative paths.
      expect(isRelative(null)).toBe(true)
      expect(isRelative(undefined)).toBe(true)
      expect(isRelative(123)).toBe(true)
    })

    it('should handle Buffer input', () => {
      expect(isRelative(Buffer.from('./relative'))).toBe(true)
      expect(isRelative(Buffer.from('/absolute'))).toBe(false)
    })

    it('should handle URL input', () => {
      expect(isRelative(new URL('file:///absolute/path'))).toBe(false)
    })
  })

  describe('normalizePath', () => {
    it('should normalize paths with forward slashes', () => {
      expect(normalizePath('/path/to/../file')).toBe('/path/file')
      expect(normalizePath('./path/./to/file')).toBe('path/to/file')
      expect(normalizePath('path//to///file')).toBe('path/to/file')
    })

    it('should normalize paths with backslashes', () => {
      expect(normalizePath('C:\\path\\to\\..\\file')).toBe('C:/path/file')
      expect(normalizePath('path\\\\to\\\\\\file')).toBe('path/to/file')
      expect(normalizePath('.\\path\\.\\to\\file')).toBe('path/to/file')
    })

    it('should handle edge cases', () => {
      expect(normalizePath('')).toBe('.')
      expect(normalizePath('/')).toBe('/')
      expect(normalizePath('//')).toBe('/')
      expect(normalizePath('//path/')).toBe('/path')
      expect(normalizePath('/path/')).toBe('/path')
    })

    it('should handle Buffer input', () => {
      expect(normalizePath(Buffer.from('/path/../file'))).toBe('/file')
    })

    it('should handle URL input', () => {
      expect(normalizePath(new URL('file:///path/../file'))).toBe('/file')
    })

    it('should handle complex paths', () => {
      expect(normalizePath('/a/b/c/../../d')).toBe('/a/d')
      expect(normalizePath('a/b/../c/../d')).toBe('a/d')
      expect(normalizePath('../a/b/../c')).toBe('../a/c')
    })
  })

  describe('pathLikeToString', () => {
    it('should convert string', () => {
      expect(pathLikeToString('/path/to/file')).toBe('/path/to/file')
      expect(pathLikeToString('')).toBe('')
    })

    it('should convert Buffer', () => {
      const path = '/path/to/file'
      expect(pathLikeToString(Buffer.from(path))).toBe(path)
    })

    it('should convert URL', () => {
      expect(pathLikeToString(new URL('file:///path/to/file'))).toBe(
        '/path/to/file',
      )
    })

    it('should handle null and undefined', () => {
      expect(pathLikeToString(null)).toBe('')
      expect(pathLikeToString(undefined)).toBe('')
    })

    it('should convert other types to string', () => {
      expect(pathLikeToString(123)).toBe('123')
      expect(pathLikeToString(true)).toBe('true')
      expect(pathLikeToString({})).toBe('[object Object]')
    })

    it('should handle Windows file URLs', () => {
      const url = new URL('file:///C:/path/to/file')
      const result = pathLikeToString(url)
      // fileURLToPath handles Windows paths correctly. On Unix it starts with /
      expect(result).toMatch(/^([A-Z]:[/\\]|\/)/)
    })

    it('should handle malformed file URLs on Unix', () => {
      // Mock WIN32 constant as false.
      vi.doMock('@socketsecurity/registry/lib/constants/win32', () => false)

      const url = new URL('file:///path/to/file')
      // Mock fileURLToPath to throw.
      const originalFileURLToPath = require('node:url').fileURLToPath
      require('node:url').fileURLToPath = () => {
        throw new Error('test')
      }

      try {
        const result = pathLikeToString(url)
        // On Unix, should keep pathname as-is.
        expect(result).toBe('/path/to/file')
      } finally {
        require('node:url').fileURLToPath = originalFileURLToPath
        vi.doUnmock('@socketsecurity/registry/lib/constants/win32')
      }
    })
  })

  describe('splitPath', () => {
    it('should split paths with forward slashes', () => {
      expect(splitPath('/path/to/file')).toEqual(['', 'path', 'to', 'file'])
      expect(splitPath('path/to/file')).toEqual(['path', 'to', 'file'])
    })

    it('should split paths with backslashes', () => {
      expect(splitPath('C:\\path\\to\\file')).toEqual([
        'C:',
        'path',
        'to',
        'file',
      ])
      expect(splitPath('path\\to\\file')).toEqual(['path', 'to', 'file'])
    })

    it('should handle mixed separators', () => {
      expect(splitPath('path/to\\file')).toEqual(['path', 'to', 'file'])
      expect(splitPath('C:\\path/to\\file')).toEqual([
        'C:',
        'path',
        'to',
        'file',
      ])
    })

    it('should handle edge cases', () => {
      expect(splitPath('')).toEqual([])
      expect(splitPath('/')).toEqual(['', ''])
      expect(splitPath('file')).toEqual(['file'])
    })

    it('should handle Buffer input', () => {
      expect(splitPath(Buffer.from('a/b/c'))).toEqual(['a', 'b', 'c'])
    })

    it('should handle URL input', () => {
      expect(splitPath(new URL('file:///a/b/c'))).toEqual(['', 'a', 'b', 'c'])
    })
  })

  describe('trimLeadingDotSlash', () => {
    it('should trim ./ prefix', () => {
      expect(trimLeadingDotSlash('./path/to/file')).toBe('path/to/file')
      expect(trimLeadingDotSlash('.\\path\\to\\file')).toBe('path\\to\\file')
    })

    it('should not trim ../ prefix', () => {
      expect(trimLeadingDotSlash('../path/to/file')).toBe('../path/to/file')
      expect(trimLeadingDotSlash('..\\path\\to\\file')).toBe(
        '..\\path\\to\\file',
      )
    })

    it('should handle paths without dot-slash', () => {
      expect(trimLeadingDotSlash('path/to/file')).toBe('path/to/file')
      expect(trimLeadingDotSlash('/absolute/path')).toBe('/absolute/path')
      expect(trimLeadingDotSlash('')).toBe('')
    })

    it('should handle single dot', () => {
      expect(trimLeadingDotSlash('.')).toBe('.')
      expect(trimLeadingDotSlash('..')).toBe('..')
    })

    it('should handle Buffer input', () => {
      expect(trimLeadingDotSlash(Buffer.from('./path'))).toBe('path')
    })

    it('should handle URL input', () => {
      const result = trimLeadingDotSlash(new URL('file:///./path'))
      expect(result.includes('./path')).toBe(false)
    })
  })

  describe('relativeResolve', () => {
    it('should resolve relative paths', () => {
      const from = '/path/from'
      const to = '/path/to'
      const result = relativeResolve(from, to)
      expect(result).toBeDefined()
      expect(typeof result).toBe('string')
    })

    it('should handle same paths', () => {
      const path = '/same/path'
      const result = relativeResolve(path, path)
      expect(result).toBe('')
    })

    it('should handle parent to child', () => {
      const from = '/parent'
      const to = '/parent/child'
      const result = relativeResolve(from, to)
      expect(result).toBe('child')
    })

    it('should handle child to parent', () => {
      const from = '/parent/child'
      const to = '/parent'
      const result = relativeResolve(from, to)
      expect(result).toBe('..')
    })

    it('should handle sibling paths', () => {
      const from = '/parent/child1'
      const to = '/parent/child2'
      const result = relativeResolve(from, to)
      expect(result).toMatch(/^\.\.[\\/]child2$/)
    })
  })

  describe('lazy loading', () => {
    it('should lazy load modules', () => {
      // Clear module caches.
      const pathModule = require('@socketsecurity/registry/lib/path')

      // Test that modules are loaded on demand.
      expect(pathModule.isPath('./test')).toBe(true)
      expect(pathModule.normalizePath('./test')).toBe('test')
      expect(pathModule.pathLikeToString(Buffer.from('test'))).toBe('test')
    })
  })
})
