import { describe, expect, it } from 'vitest'

const {
  isNodeModules,
  isPath,
  isRelative,
  normalizePath,
  pathLikeToString,
  splitPath,
  trimLeadingDotSlash,
} = require('../../registry/dist/lib/path')

describe('path module', () => {
  describe('isPath', () => {
    it('should identify paths correctly', () => {
      expect(isPath('./file')).toBe(true)
      expect(isPath('../file')).toBe(true)
      expect(isPath('/absolute/path')).toBe(true)
      expect(isPath('relative/path')).toBe(true)
      expect(isPath('C:\\path\\file')).toBe(true)
      expect(isPath('\\\\network\\share')).toBe(true)
    })

    it('should return false for non-paths', () => {
      expect(isPath('@scope/package')).toBe(false)
      expect(isPath('package-name')).toBe(false)
    })

    it('should handle edge cases', () => {
      expect(isPath('.')).toBe(true)
      expect(isPath('..')).toBe(true)
      expect(isPath('/')).toBe(true)
    })
  })

  describe('isRelative', () => {
    it('should identify relative paths', () => {
      expect(isRelative('relative/path')).toBe(true)
      expect(isRelative('./relative')).toBe(true)
      expect(isRelative('../relative')).toBe(true)
      expect(isRelative('file.txt')).toBe(true)
    })

    it('should return false for absolute paths', () => {
      expect(isRelative('/absolute/path')).toBe(false)
      if (process.platform === 'win32') {
        expect(isRelative('C:\\path')).toBe(false)
      }
    })

    it('should handle edge cases', () => {
      expect(isRelative('.')).toBe(true)
      expect(isRelative('..')).toBe(true)
      expect(isRelative('')).toBe(true)
    })
  })

  describe('isNodeModules', () => {
    it('should detect node_modules paths', () => {
      expect(isNodeModules('node_modules')).toBe(true)
      expect(isNodeModules('/path/to/node_modules')).toBe(true)
      expect(isNodeModules('node_modules/package')).toBe(true)
      expect(isNodeModules('/project/node_modules/lib/file.js')).toBe(true)
    })

    it('should return false for non-node_modules paths', () => {
      expect(isNodeModules('/path/to/src')).toBe(false)
      expect(isNodeModules('src/node_modules_backup')).toBe(false)
      expect(isNodeModules('')).toBe(false)
    })

    it('should handle Windows paths', () => {
      expect(isNodeModules('C:\\project\\node_modules')).toBe(true)
      expect(isNodeModules('node_modules\\package')).toBe(true)
    })
  })

  describe('normalizePath', () => {
    it('should normalize paths', () => {
      expect(normalizePath('/path//to///file')).toBe('/path/to/file')
      expect(normalizePath('./path/./to/file')).toBe('path/to/file')
      expect(normalizePath('path/../to/file')).toBe('to/file')
    })

    it('should handle Windows paths', () => {
      const normalized = normalizePath('C:\\path\\to\\file')
      expect(normalized).toMatch(/path[/\\]to[/\\]file/)
    })

    it('should handle empty strings', () => {
      expect(normalizePath('')).toBe('.')
    })

    it('should handle URLs', () => {
      const fileUrl = 'file:///path/to/file'
      const normalized = normalizePath(fileUrl)
      expect(normalized).toBeDefined()
    })

    it('should remove trailing slashes', () => {
      expect(normalizePath('/path/to/dir/')).toBe('/path/to/dir')
      expect(normalizePath('path/')).toBe('path')
    })
  })

  describe('splitPath', () => {
    it('should split paths into segments', () => {
      expect(splitPath('/path/to/file')).toEqual(['', 'path', 'to', 'file'])
      expect(splitPath('path/to/file')).toEqual(['path', 'to', 'file'])
      expect(splitPath('./path/to/file')).toEqual(['.', 'path', 'to', 'file'])
    })

    it('should handle Windows paths', () => {
      const segments = splitPath('C:\\path\\to\\file')
      expect(segments).toContain('path')
      expect(segments).toContain('to')
      expect(segments).toContain('file')
    })

    it('should handle empty paths', () => {
      expect(splitPath('')).toEqual([])
    })

    it('should handle single segments', () => {
      expect(splitPath('file')).toEqual(['file'])
      expect(splitPath('/')).toEqual(['', ''])
    })
  })

  describe('trimLeadingDotSlash', () => {
    it('should trim leading ./ from paths', () => {
      expect(trimLeadingDotSlash('./path/to/file')).toBe('path/to/file')
      expect(trimLeadingDotSlash('./file.txt')).toBe('file.txt')
      expect(trimLeadingDotSlash('./')).toBe('')
    })

    it('should not modify paths without ./', () => {
      expect(trimLeadingDotSlash('path/to/file')).toBe('path/to/file')
      expect(trimLeadingDotSlash('/absolute/path')).toBe('/absolute/path')
      expect(trimLeadingDotSlash('../relative')).toBe('../relative')
    })

    it('should only trim from the beginning', () => {
      expect(trimLeadingDotSlash('./path/./to/file')).toBe('path/./to/file')
    })

    it('should handle empty strings', () => {
      expect(trimLeadingDotSlash('')).toBe('')
    })

    it('should handle Windows paths', () => {
      expect(trimLeadingDotSlash('.\\path\\to\\file')).toBe('path\\to\\file')
    })
  })

  describe('pathLikeToString', () => {
    it('should convert strings', () => {
      expect(pathLikeToString('/path/to/file')).toBe('/path/to/file')
      expect(pathLikeToString('relative/path')).toBe('relative/path')
    })

    it('should convert URL objects', () => {
      const url = new URL('file:///path/to/file')
      const result = pathLikeToString(url)
      expect(typeof result).toBe('string')
      expect(result).toContain('path')
    })

    it('should handle Buffer', () => {
      const buffer = Buffer.from('/path/to/file')
      expect(pathLikeToString(buffer)).toBe('/path/to/file')
    })

    it('should handle objects with toString', () => {
      const obj = {
        toString() {
          return '/custom/path'
        },
      }
      expect(pathLikeToString(obj)).toBe('/custom/path')
    })

    it('should handle null and undefined', () => {
      expect(pathLikeToString(null)).toBe('')
      expect(pathLikeToString(undefined)).toBe('')
    })

    it('should handle empty string', () => {
      expect(pathLikeToString('')).toBe('')
    })
  })
})
