import { describe, expect, it } from 'vitest'

import {
  isNodeModules,
  isPath,
  isRelative,
  normalizePath,
  pathLikeToString,
  relativeResolve,
  splitPath,
  trimLeadingDotSlash,
} from '../../registry/dist/lib/path.js'

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

    it('should preserve multiple leading .. segments', () => {
      expect(normalizePath('../path')).toBe('../path')
      expect(normalizePath('../../path')).toBe('../../path')
      expect(normalizePath('../../../path')).toBe('../../../path')
      expect(normalizePath('../../../../path')).toBe('../../../../path')
    })

    it('should preserve leading .. segments in complex paths', () => {
      expect(
        normalizePath('../../../registry/lib/constants/abort-signal'),
      ).toBe('../../../registry/lib/constants/abort-signal')
      expect(normalizePath('../../registry/lib/path')).toBe(
        '../../registry/lib/path',
      )
      expect(normalizePath('../a/b/c')).toBe('../a/b/c')
    })

    it('should collapse normal segments with .. correctly', () => {
      expect(normalizePath('../a/../b')).toBe('../b')
      expect(normalizePath('../../a/../b')).toBe('../../b')
      expect(normalizePath('../a/b/../c')).toBe('../a/c')
      expect(normalizePath('a/../b')).toBe('b')
      expect(normalizePath('a/b/../../c')).toBe('c')
    })

    it('should not collapse leading .. with each other', () => {
      expect(normalizePath('../..')).toBe('../..')
      expect(normalizePath('../../..')).toBe('../../..')
      expect(normalizePath('../../../..')).toBe('../../../..')
    })

    it('should handle mixed .. and . segments', () => {
      expect(normalizePath('../.././path')).toBe('../../path')
      expect(normalizePath('./../path')).toBe('../path')
      expect(normalizePath('.././../path')).toBe('../../path')
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
      // @ts-expect-error - Testing runtime behavior with toString object.
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

  describe('relativeResolve', () => {
    it('should resolve relative path between two paths', () => {
      const from = '/path/to/from'
      const to = '/path/to/target'
      expect(relativeResolve(from, to)).toBe('../target')
    })

    it('should resolve when paths are in same directory', () => {
      const from = '/path/to/dir'
      const to = '/path/to/file'
      expect(relativeResolve(from, to)).toBe('../file')
    })

    it('should resolve when target is ancestor', () => {
      const from = '/path/to/deep/nested'
      const to = '/path/to'
      expect(relativeResolve(from, to)).toBe('../..')
    })

    it('should resolve when target is descendant', () => {
      const from = '/path/to'
      const to = '/path/to/deep/nested'
      expect(relativeResolve(from, to)).toBe('deep/nested')
    })

    it('should handle relative paths as input', () => {
      const from = 'src/lib'
      const to = 'src/test'
      expect(relativeResolve(from, to)).toBe('../test')
    })

    it('should handle same path', () => {
      const path = '/path/to/file'
      expect(relativeResolve(path, path)).toBe('')
    })

    it('should handle root paths', () => {
      expect(relativeResolve('/', '/path')).toBe('path')
    })

    it('should handle current directory', () => {
      const from = './src'
      const to = './lib'
      const result = relativeResolve(from, to)
      expect(result).toBeDefined()
    })
  })

  describe('paths with spaces', () => {
    describe('isPath', () => {
      it('should identify Unix paths with spaces', () => {
        expect(isPath('/path with spaces/to/file.js')).toBe(true)
        expect(isPath('./path with spaces/file.js')).toBe(true)
        expect(isPath('../path with spaces/file.js')).toBe(true)
        expect(isPath('relative/path with spaces/file.js')).toBe(true)
      })

      it('should identify Windows paths with spaces', () => {
        expect(isPath('C:\\Program Files\\node\\bin')).toBe(true)
        expect(isPath('C:\\Users\\John Doe\\projects\\test')).toBe(true)
        expect(isPath('path with spaces\\to\\file.js')).toBe(true)
      })

      it('should identify user directory paths with spaces', () => {
        expect(isPath('/Users/John Doe/projects/test')).toBe(true)
        expect(isPath('/home/user name/documents')).toBe(true)
      })
    })

    describe('normalizePath', () => {
      it('should normalize Unix paths with spaces', () => {
        expect(normalizePath('/path with spaces/to/file')).toBe(
          '/path with spaces/to/file',
        )
        expect(normalizePath('./path with spaces/./to/file')).toBe(
          'path with spaces/to/file',
        )
        expect(normalizePath('path with spaces/../to/file')).toBe('to/file')
      })

      it('should normalize Windows paths with spaces', () => {
        expect(normalizePath('C:\\Program Files\\node\\bin')).toBe(
          'C:/Program Files/node/bin',
        )
        expect(normalizePath('C:\\Users\\John Doe\\projects\\test')).toBe(
          'C:/Users/John Doe/projects/test',
        )
      })

      it('should normalize relative paths with spaces', () => {
        expect(normalizePath('./my project/src/file.js')).toBe(
          'my project/src/file.js',
        )
        expect(normalizePath('../my project/../other project/file.js')).toBe(
          '../other project/file.js',
        )
      })

      it('should handle multiple spaces in path segments', () => {
        expect(normalizePath('/path  with  spaces/to/file')).toBe(
          '/path  with  spaces/to/file',
        )
        expect(normalizePath('path   with   multiple   spaces')).toBe(
          'path   with   multiple   spaces',
        )
      })
    })

    describe('splitPath', () => {
      it('should split Unix paths with spaces', () => {
        expect(splitPath('/path with spaces/to/file')).toEqual([
          '',
          'path with spaces',
          'to',
          'file',
        ])
        expect(splitPath('path with spaces/to/file')).toEqual([
          'path with spaces',
          'to',
          'file',
        ])
      })

      it('should split Windows paths with spaces', () => {
        expect(splitPath('C:\\Program Files\\node\\bin')).toEqual([
          'C:',
          'Program Files',
          'node',
          'bin',
        ])
        expect(splitPath('C:\\Users\\John Doe\\projects')).toEqual([
          'C:',
          'Users',
          'John Doe',
          'projects',
        ])
      })
    })

    describe('trimLeadingDotSlash', () => {
      it('should trim leading ./ from paths with spaces', () => {
        expect(trimLeadingDotSlash('./path with spaces/to/file')).toBe(
          'path with spaces/to/file',
        )
        expect(trimLeadingDotSlash('./my project/file.js')).toBe(
          'my project/file.js',
        )
      })

      it('should trim leading .\\ from Windows paths with spaces', () => {
        expect(trimLeadingDotSlash('.\\path with spaces\\to\\file')).toBe(
          'path with spaces\\to\\file',
        )
        expect(trimLeadingDotSlash('.\\Program Files\\node')).toBe(
          'Program Files\\node',
        )
      })

      it('should not trim ../ from paths with spaces', () => {
        expect(trimLeadingDotSlash('../path with spaces/to/file')).toBe(
          '../path with spaces/to/file',
        )
        expect(trimLeadingDotSlash('..\\path with spaces\\to\\file')).toBe(
          '..\\path with spaces\\to\\file',
        )
      })
    })

    describe('isNodeModules', () => {
      it('should detect node_modules in paths with spaces', () => {
        expect(isNodeModules('/path with spaces/node_modules/package')).toBe(
          true,
        )
        expect(isNodeModules('C:\\Program Files\\node_modules\\package')).toBe(
          true,
        )
      })

      it('should return false for non-node_modules paths with spaces', () => {
        expect(isNodeModules('/path with spaces/src')).toBe(false)
        expect(isNodeModules('C:\\Program Files\\src')).toBe(false)
      })
    })

    describe('isRelative', () => {
      it('should identify relative paths with spaces', () => {
        expect(isRelative('path with spaces/to/file')).toBe(true)
        expect(isRelative('./path with spaces/file')).toBe(true)
        expect(isRelative('../path with spaces/file')).toBe(true)
      })

      it('should identify absolute paths with spaces', () => {
        expect(isRelative('/path with spaces/to/file')).toBe(false)
        if (process.platform === 'win32') {
          expect(isRelative('C:\\Program Files\\node')).toBe(false)
        }
      })
    })

    describe('pathLikeToString', () => {
      it('should handle Buffer with spaces', () => {
        const buffer = Buffer.from('/path with spaces/to/file')
        expect(pathLikeToString(buffer)).toBe('/path with spaces/to/file')
      })

      it('should handle URLs with spaces', () => {
        const url = new URL('file:///path%20with%20spaces/to/file')
        const result = pathLikeToString(url)
        expect(result).toContain('path with spaces')
      })
    })

    describe('relativeResolve', () => {
      it('should resolve paths with spaces', () => {
        const from = '/path with spaces/to/from'
        const to = '/path with spaces/to/target'
        expect(relativeResolve(from, to)).toBe('../target')
      })

      it('should handle parent to child with spaces', () => {
        const from = '/my project/parent'
        const to = '/my project/parent/child folder'
        expect(relativeResolve(from, to)).toBe('child folder')
      })

      it('should handle child to parent with spaces', () => {
        const from = '/my project/parent/child folder'
        const to = '/my project/parent'
        expect(relativeResolve(from, to)).toBe('..')
      })
    })
  })
})
