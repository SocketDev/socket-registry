import { describe, expect, it } from 'vitest'

import { normalizePath } from '../../registry/dist/lib/path.js'

describe('path module - Windows UNC and namespace paths', () => {
  describe('normalizePath - UNC paths', () => {
    it('should normalize UNC server paths', () => {
      const result = normalizePath('\\\\server\\share\\file.txt')
      expect(result).toBe('//server/share/file.txt')
    })

    it('should normalize UNC paths with forward slashes', () => {
      const result = normalizePath('//server/share/file.txt')
      expect(result).toBe('//server/share/file.txt')
    })

    it('should handle UNC paths with mixed slashes', () => {
      const result = normalizePath('\\\\server/share\\file.txt')
      expect(result).toBe('//server/share/file.txt')
    })

    it('should handle UNC paths with multiple trailing slashes', () => {
      const result = normalizePath('\\\\server\\\\\\share\\\\file.txt')
      expect(result).toBe('//server/share/file.txt')
    })

    it('should handle UNC paths with . segments', () => {
      const result = normalizePath('\\\\server\\share\\.\\file.txt')
      expect(result).toBe('//server/share/file.txt')
    })

    it('should handle UNC paths with .. segments', () => {
      const result = normalizePath('\\\\server\\share\\dir\\..\\file.txt')
      expect(result).toBe('//server/share/file.txt')
    })

    it('should handle invalid UNC path (no share name)', () => {
      const result = normalizePath('\\\\server')
      expect(result).toBe('/server')
    })

    it('should handle invalid UNC path (only slashes)', () => {
      const result = normalizePath('\\\\\\\\')
      expect(result).toBe('/')
    })
  })

  describe('normalizePath - Windows namespace paths', () => {
    it('should preserve \\\\?\\ namespace prefix', () => {
      const result = normalizePath('\\\\?\\C:\\Users\\file.txt')
      expect(result).toBe('//?/C:/Users/file.txt')
    })

    it('should handle \\\\.\\  namespace prefix', () => {
      const result = normalizePath('\\\\.\\C:\\Users\\file.txt')
      // The dot is normalized, leaving the double slash for UNC-like path
      expect(result).toBe('//C:/Users/file.txt')
    })

    it('should normalize paths within namespace', () => {
      const result = normalizePath('\\\\?\\C:\\Users\\.\\file.txt')
      expect(result).toBe('//?/C:/Users/file.txt')
    })

    it('should handle namespace paths with .. segments', () => {
      const result = normalizePath('\\\\?\\C:\\Users\\dir\\..\\file.txt')
      expect(result).toBe('//?/C:/Users/file.txt')
    })
  })

  describe('normalizePath - multiple consecutive slashes', () => {
    it('should collapse multiple leading slashes (not UNC)', () => {
      const result = normalizePath('///path/to/file')
      expect(result).toBe('/path/to/file')
    })

    it('should collapse multiple slashes in middle', () => {
      const result = normalizePath('/path///to////file')
      expect(result).toBe('/path/to/file')
    })

    it('should handle backslashes at start', () => {
      const result = normalizePath('\\path\\to\\file')
      expect(result).toBe('/path/to/file')
    })

    it('should handle single backslash', () => {
      const result = normalizePath('\\')
      expect(result).toBe('/')
    })
  })

  describe('normalizePath - complex .. handling', () => {
    it('should handle leading .. in relative paths', () => {
      const result = normalizePath('../file.txt')
      expect(result).toBe('../file.txt')
    })

    it('should handle multiple leading ..', () => {
      const result = normalizePath('../../file.txt')
      expect(result).toBe('../../file.txt')
    })

    it('should collapse .. after directory', () => {
      const result = normalizePath('dir/../file.txt')
      expect(result).toBe('file.txt')
    })

    it('should handle .. after multiple directories', () => {
      const result = normalizePath('a/b/c/../../file.txt')
      expect(result).toBe('a/file.txt')
    })

    it('should not collapse .. beyond root for absolute paths', () => {
      const result = normalizePath('/dir/../../file.txt')
      expect(result).toBe('/file.txt')
    })

    it('should preserve .. when collapsing against ..', () => {
      const result = normalizePath('../a/../b')
      expect(result).toBe('../b')
    })

    it('should handle .. collapsing entire relative path', () => {
      const result = normalizePath('a/..')
      expect(result).toBe('.')
    })

    it('should handle multiple .. collapsing to empty', () => {
      const result = normalizePath('a/b/../..')
      expect(result).toBe('.')
    })

    it('should preserve leading .. when path becomes empty', () => {
      const result = normalizePath('../a/..')
      expect(result).toBe('..')
    })
  })

  describe('normalizePath - edge cases', () => {
    it('should handle empty string', () => {
      const result = normalizePath('')
      expect(result).toBe('.')
    })

    it('should handle single dot', () => {
      const result = normalizePath('.')
      expect(result).toBe('.')
    })

    it('should handle double dot', () => {
      const result = normalizePath('..')
      expect(result).toBe('..')
    })

    it('should handle path ending with .', () => {
      const result = normalizePath('path/to/.')
      expect(result).toBe('path/to')
    })

    it('should handle path ending with ..', () => {
      const result = normalizePath('path/to/..')
      expect(result).toBe('path')
    })

    it('should handle path with only dots', () => {
      const result = normalizePath('./././.')
      expect(result).toBe('.')
    })
  })
})
