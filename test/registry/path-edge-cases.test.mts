import { Buffer } from 'node:buffer'
import { URL } from 'node:url'

import { describe, expect, it } from 'vitest'

const {
  normalizePath,
  pathLikeToString,
  relativeResolve,
  splitPath,
} = require('../../registry/dist/lib/path')

describe('path edge cases', () => {
  describe('normalizePath - Windows namespaces', () => {
    it('should handle \\\\?\\ namespace paths', () => {
      const result = normalizePath('\\\\?\\C:\\path\\to\\file')
      expect(result).toContain('//')
    })

    it('should handle \\\\.\\  namespace paths', () => {
      const result = normalizePath('\\\\.\\C:\\path\\to\\file')
      expect(result).toContain('//')
    })

    it('should handle short namespace paths', () => {
      const result = normalizePath('\\\\?\\')
      expect(result).toBeTruthy()
    })
  })

  describe('normalizePath - UNC paths', () => {
    it('should preserve UNC path double slashes', () => {
      const result = normalizePath('\\\\server\\share\\path')
      expect(result).toMatch(/^\/\//)
      expect(result).toContain('server')
      expect(result).toContain('share')
    })

    it('should handle UNC paths with forward slashes', () => {
      const result = normalizePath('//server/share/path')
      expect(result).toMatch(/^\/\//)
    })

    it('should handle invalid UNC paths without share', () => {
      const result = normalizePath('\\\\server\\')
      expect(result).toBeTruthy()
    })

    it('should handle UNC paths with extra slashes', () => {
      const result = normalizePath('\\\\\\server\\share')
      expect(result).toBeTruthy()
    })

    it('should handle very short UNC-like paths', () => {
      const result = normalizePath('\\\\')
      expect(result).toBe('/')
    })

    it('should handle UNC path with only server name', () => {
      const result = normalizePath('\\\\server')
      expect(result).toBeTruthy()
    })
  })

  describe('normalizePath - complex .. handling', () => {
    it('should handle .. that removes all segments', () => {
      const result = normalizePath('a/b/../../..')
      expect(result).toBe('..')
    })

    it('should preserve leading .. with other segments', () => {
      const result = normalizePath('../a/b/../..')
      expect(result).toBe('..')
    })

    it('should handle consecutive .. at start', () => {
      const result = normalizePath('../../a/../b')
      expect(result).toBe('../../b')
    })

    it('should handle .. collapsing middle segments', () => {
      const result = normalizePath('a/b/c/../../d')
      expect(result).toBe('a/d')
    })

    it('should handle mixed . and .. segments', () => {
      const result = normalizePath('a/./b/../c/./d/..')
      expect(result).toBe('a/c')
    })

    it('should handle .. with absolute paths', () => {
      const result = normalizePath('/a/b/../c')
      expect(result).toBe('/a/c')
    })

    it('should not collapse .. above root', () => {
      const result = normalizePath('/a/../..')
      expect(result).toBe('/')
    })

    it('should handle complex leading .. sequences', () => {
      const result = normalizePath('../../../a/b')
      expect(result).toBe('../../../a/b')
    })

    it('should preserve .. when removing segments', () => {
      const result = normalizePath('a/../..')
      expect(result).toBe('..')
    })

    it('should handle .. after multiple segments', () => {
      const result = normalizePath('a/b/c/d/../../e')
      expect(result).toBe('a/b/e')
    })

    it('should handle alternating segments and ..', () => {
      const result = normalizePath('a/../b/../c/../d')
      expect(result).toBe('d')
    })

    it('should handle .. with trailing slash', () => {
      const result = normalizePath('a/b/../')
      expect(result).toBe('a')
    })

    it('should handle single segment with ..', () => {
      const result = normalizePath('a/..')
      expect(result).toBe('.')
    })

    it('should handle .. after empty collapsed path', () => {
      const result = normalizePath('./a/.././..')
      expect(result).toBe('..')
    })
  })

  describe('normalizePath - empty and single character', () => {
    it('should handle empty string', () => {
      expect(normalizePath('')).toBe('.')
    })

    it('should handle single forward slash', () => {
      expect(normalizePath('/')).toBe('/')
    })

    it('should handle single backslash', () => {
      expect(normalizePath('\\')).toBe('/')
    })

    it('should handle single dot', () => {
      expect(normalizePath('.')).toBe('.')
    })

    it('should handle any single character', () => {
      const result = normalizePath('a')
      expect(result).toBe('a')
    })
  })

  describe('normalizePath - multiple slashes', () => {
    it('should collapse multiple forward slashes', () => {
      const result = normalizePath('///path///to///file')
      expect(result).toBe('/path/to/file')
    })

    it('should collapse multiple backslashes', () => {
      const result = normalizePath('\\\\\\path\\\\\\to\\\\\\file')
      expect(result).toBe('/path/to/file')
    })

    it('should handle mixed slash types', () => {
      const result = normalizePath('/\\path\\/to\\file')
      expect(result).toBeTruthy()
    })
  })

  describe('normalizePath - segments', () => {
    it('should remove empty segments', () => {
      const result = normalizePath('/a//b//c')
      expect(result).toBe('/a/b/c')
    })

    it('should remove single dot segments', () => {
      const result = normalizePath('/a/./b/./c')
      expect(result).toBe('/a/b/c')
    })

    it('should handle path ending with .', () => {
      const result = normalizePath('/path/to/.')
      expect(result).toBe('/path/to')
    })

    it('should handle path ending with ..', () => {
      const result = normalizePath('/path/to/..')
      expect(result).toBe('/path')
    })

    it('should handle only dots and slashes', () => {
      const result = normalizePath('./..')
      expect(result).toBe('..')
    })

    it('should handle relative path with only ..', () => {
      const result = normalizePath('..')
      expect(result).toBe('..')
    })
  })

  describe('normalizePath - Buffer and URL', () => {
    it('should handle Buffer input', () => {
      const result = normalizePath(Buffer.from('/path/to/file'))
      expect(result).toBe('/path/to/file')
    })

    it('should handle URL input', () => {
      const result = normalizePath(new URL('file:///path/to/file'))
      expect(result).toBe('/path/to/file')
    })

    it('should handle Buffer with complex path', () => {
      const result = normalizePath(Buffer.from('./a/../b'))
      expect(result).toBe('b')
    })
  })

  describe('splitPath - edge cases', () => {
    it('should handle empty path', () => {
      expect(splitPath('')).toEqual([])
    })

    it('should handle single segment', () => {
      expect(splitPath('file')).toEqual(['file'])
    })

    it('should handle path with multiple slashes', () => {
      const result = splitPath('/a//b///c')
      expect(result).toContain('a')
      expect(result).toContain('b')
      expect(result).toContain('c')
    })

    it('should handle Windows path', () => {
      const result = splitPath('C:\\path\\to\\file')
      expect(result.length).toBeGreaterThan(1)
    })

    it('should handle mixed slashes', () => {
      const result = splitPath('path/to\\file')
      expect(result.length).toBeGreaterThan(1)
    })

    it('should handle trailing slash', () => {
      const result = splitPath('path/to/')
      expect(result.length).toBeGreaterThan(0)
    })

    it('should handle leading slash', () => {
      const result = splitPath('/path/to')
      expect(result).toContain('path')
    })

    it('should handle dots in segments', () => {
      const result = splitPath('./a/../b')
      expect(result.length).toBeGreaterThan(0)
    })

    it('should handle Buffer input', () => {
      const result = splitPath(Buffer.from('path/to/file'))
      expect(result).toContain('path')
      expect(result).toContain('to')
      expect(result).toContain('file')
    })

    it('should handle URL input', () => {
      const result = splitPath(new URL('file:///path/to/file'))
      expect(result).toContain('path')
      expect(result).toContain('to')
      expect(result).toContain('file')
    })
  })

  describe('normalizePath - prefix handling', () => {
    it('should handle path with only prefix', () => {
      const result = normalizePath('/')
      expect(result).toBe('/')
    })

    it('should handle absolute path with ..', () => {
      const result = normalizePath('/..')
      expect(result).toBe('/')
    })

    it('should handle absolute path with single dot', () => {
      const result = normalizePath('/.')
      expect(result).toBe('/')
    })

    it('should preserve single leading ..', () => {
      const result = normalizePath('..')
      expect(result).toBe('..')
    })

    it('should handle path that becomes empty after collapse', () => {
      const result = normalizePath('a/b/../..')
      expect(result).toBe('.')
    })
  })

  describe('pathLikeToString - URL error handling', () => {
    it('should handle malformed file URLs without drive letter', () => {
      // Create a URL that will cause fileURLToPath to fail
      const url = new URL('file:///malformed/path')
      const result = pathLikeToString(url)
      expect(result).toBeTruthy()
      expect(typeof result).toBe('string')
    })

    it('should handle file URL with pathname', () => {
      const url = new URL('file:///home/user/file.txt')
      const result = pathLikeToString(url)
      expect(result).toContain('home')
    })

    it('should handle Windows file URLs', () => {
      const url = new URL('file:///C:/Windows/path')
      const result = pathLikeToString(url)
      expect(result).toBeTruthy()
    })

    it('should handle file URLs with only root', () => {
      const url = new URL('file:///')
      const result = pathLikeToString(url)
      expect(result).toBeTruthy()
    })
  })

  describe('relativeResolve', () => {
    it('should resolve relative path between two paths', () => {
      const result = relativeResolve('/path/to/file', '/path/to/other')
      expect(result).toBeTruthy()
      expect(typeof result).toBe('string')
    })

    it('should handle same path', () => {
      const result = relativeResolve('/path', '/path')
      expect(result).toBe('')
    })

    it('should handle parent directory', () => {
      const result = relativeResolve('/path/to/file', '/path/to')
      expect(result).toBeTruthy()
    })

    it('should handle child directory', () => {
      const result = relativeResolve('/path/to', '/path/to/child')
      expect(result).toBe('child')
    })

    it('should handle sibling directories', () => {
      const result = relativeResolve('/path/a', '/path/b')
      expect(result).toBeTruthy()
    })

    it('should handle completely different paths', () => {
      const result = relativeResolve('/foo/bar', '/baz/qux')
      expect(result).toBeTruthy()
    })

    it('should handle relative paths', () => {
      const result = relativeResolve('a/b', 'a/c')
      expect(result).toBeTruthy()
    })
  })
})
