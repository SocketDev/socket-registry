import { Buffer } from 'node:buffer'
import { URL } from 'node:url'

import { describe, expect, it, vi } from 'vitest'

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
      expect(isPath('C:\\Windows\\path')).toBe(true)
      expect(isPath('path\\with\\backslashes')).toBe(true)
    })

    it('should return false for non-paths', () => {
      expect(isPath('@scope/package')).toBe(false)
      expect(isPath('package-name')).toBe(false)
      expect(isPath('@scope')).toBe(false)
      expect(isPath('')).toBe(false)
      // @ts-expect-error - Testing runtime behavior with invalid types.
      expect(isPath(null)).toBe(false)
      // @ts-expect-error - Testing runtime behavior with invalid types.
      expect(isPath(undefined)).toBe(false)
      // @ts-expect-error - Testing runtime behavior with invalid types.
      expect(isPath(123)).toBe(false)
    })

    it('should handle edge cases', () => {
      expect(isPath('.')).toBe(true)
      expect(isPath('..')).toBe(true)
      expect(isPath('/')).toBe(true)
    })

    it('should handle Buffer and URL inputs', () => {
      expect(isPath(Buffer.from('./file'))).toBe(true)
      expect(isPath(new URL('file:///path/to/file'))).toBe(true)
      expect(isPath(Buffer.from('./path'))).toBe(true)
      expect(isPath(Buffer.from('package-name'))).toBe(false)
    })

    it('should handle scoped packages with paths', () => {
      expect(isPath('@/some/path')).toBe(true)
      expect(isPath('@scope/package/path')).toBe(true)
      // Backslash paths are not considered paths on Unix systems.
      expect(isPath('@scope\\package\\path')).toBe(false)
    })
  })

  describe('isRelative', () => {
    it('should identify relative paths', () => {
      expect(isRelative('relative/path')).toBe(true)
      expect(isRelative('./relative')).toBe(true)
      expect(isRelative('../relative')).toBe(true)
      expect(isRelative('file.txt')).toBe(true)
      expect(isRelative('./file')).toBe(true)
      expect(isRelative('../parent')).toBe(true)
      expect(isRelative('')).toBe(true)
      expect(isRelative('.')).toBe(true)
      expect(isRelative('..')).toBe(true)
    })

    it('should return false for absolute paths', () => {
      expect(isRelative('/absolute/path')).toBe(false)
      expect(isRelative('/absolute')).toBe(false)
      // Windows drive paths are considered absolute on Windows systems.
      expect(isRelative('C:\\Windows')).toBe(process.platform !== 'win32')
      if (process.platform === 'win32') {
        expect(isRelative('C:\\path')).toBe(false)
      }
    })

    it('should handle invalid input', () => {
      // Invalid inputs are converted to strings and treated as relative paths.
      // @ts-expect-error - Testing runtime behavior with invalid types.
      expect(isRelative(null)).toBe(true)
      // @ts-expect-error - Testing runtime behavior with invalid types.
      expect(isRelative(undefined)).toBe(true)
      // @ts-expect-error - Testing runtime behavior with invalid types.
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

  describe('isNodeModules', () => {
    it('should detect node_modules paths', () => {
      expect(isNodeModules('node_modules')).toBe(true)
      expect(isNodeModules('/path/to/node_modules')).toBe(true)
      expect(isNodeModules('node_modules/package')).toBe(true)
      expect(isNodeModules('/project/node_modules/lib/file.js')).toBe(true)
      expect(isNodeModules('/path/node_modules/package')).toBe(true)
      expect(isNodeModules('C:\\path\\node_modules\\package')).toBe(true)
    })

    it('should return false for non-node_modules paths', () => {
      expect(isNodeModules('/path/to/src')).toBe(false)
      expect(isNodeModules('src/node_modules_backup')).toBe(false)
      expect(isNodeModules('')).toBe(false)
      expect(isNodeModules('/path/to/package')).toBe(false)
      expect(isNodeModules('regular/path')).toBe(false)
    })

    it('should handle Windows paths', () => {
      expect(isNodeModules('C:\\project\\node_modules')).toBe(true)
      expect(isNodeModules('node_modules\\package')).toBe(true)
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

  describe('normalizePath', () => {
    it('should normalize paths', () => {
      expect(normalizePath('/path//to///file')).toBe('/path/to/file')
      expect(normalizePath('./path/./to/file')).toBe('path/to/file')
      expect(normalizePath('path/../to/file')).toBe('to/file')
      expect(normalizePath('/path/to/../file')).toBe('/path/file')
      expect(normalizePath('path//to///file')).toBe('path/to/file')
    })

    it('should handle Windows paths', () => {
      const normalized = normalizePath('C:\\path\\to\\file')
      expect(normalized).toMatch(/path[/\\]to[/\\]file/)
      expect(normalizePath('C:\\path\\to\\..\\file')).toBe('C:/path/file')
      expect(normalizePath('path\\\\to\\\\\\file')).toBe('path/to/file')
      expect(normalizePath('.\\path\\.\\to\\file')).toBe('path/to/file')
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
      expect(normalizePath('/a/b/c/../../d')).toBe('/a/d')
      expect(normalizePath('a/b/../c/../d')).toBe('a/d')
      expect(normalizePath('../a/b/../c')).toBe('../a/c')
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

    it('should handle edge cases', () => {
      expect(normalizePath('/')).toBe('/')
      expect(normalizePath('//')).toBe('/')
      expect(normalizePath('//path/')).toBe('/path')
      expect(normalizePath('/path/')).toBe('/path')
      expect(normalizePath('\\')).toBe('/')
      expect(normalizePath('.')).toBe('.')
      expect(normalizePath('..')).toBe('..')
      expect(normalizePath('a')).toBe('a')
    })

    it('should handle Buffer input', () => {
      expect(normalizePath(Buffer.from('/path/../file'))).toBe('/file')
      expect(normalizePath(Buffer.from('/path/to/file'))).toBe('/path/to/file')
    })

    it('should handle URL input', () => {
      expect(normalizePath(new URL('file:///path/../file'))).toBe('/file')
      expect(normalizePath(new URL('file:///path/to/file'))).toBe(
        '/path/to/file',
      )
    })

    it('should collapse repeated separators', () => {
      // Forward slash collapsing
      expect(normalizePath('/a////b////c')).toBe('/a/b/c')
      expect(normalizePath('path//to///file')).toBe('path/to/file')
      expect(normalizePath('////absolute////path////')).toBe('/absolute/path')
      expect(normalizePath('relative////path///file///')).toBe(
        'relative/path/file',
      )
      expect(normalizePath('///path///to///file')).toBe('/path/to/file')
      expect(normalizePath('/path///to////file')).toBe('/path/to/file')

      // Backslash collapsing
      expect(normalizePath('path\\\\\\\\to\\\\\\\\file')).toBe('path/to/file')
      expect(normalizePath('C:\\\\\\\\Users\\\\\\\\name')).toBe('C:/Users/name')
      expect(normalizePath('\\\\\\\\absolute\\\\\\\\path\\\\\\\\')).toBe(
        '/absolute/path',
      )
      expect(normalizePath('\\\\\\path\\\\\\to\\\\\\file')).toBe(
        '/path/to/file',
      )

      // Mixed separator collapsing
      expect(normalizePath('/a\\/\\b\\//c')).toBe('/a/b/c')
      expect(normalizePath('path//\\\\to\\/\\file')).toBe('path/to/file')
      expect(normalizePath('/\\path\\/to\\file')).toBeTruthy()
    })

    describe('Windows UNC paths', () => {
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

    describe('Windows namespace paths', () => {
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

    describe('complex .. handling', () => {
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

    describe('segments', () => {
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

      it('should handle path with only dots', () => {
        const result = normalizePath('./././.')
        expect(result).toBe('.')
      })
    })

    describe('prefix handling', () => {
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

      it('should handle single backslash', () => {
        const result = normalizePath('\\')
        expect(result).toBe('/')
      })

      it('should handle backslashes at start', () => {
        const result = normalizePath('\\path\\to\\file')
        expect(result).toBe('/path/to/file')
      })

      it('should collapse multiple leading slashes (not UNC)', () => {
        const result = normalizePath('///path/to/file')
        expect(result).toBe('/path/to/file')
      })
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
      expect(splitPath('C:\\path\\to\\file')).toEqual([
        'C:',
        'path',
        'to',
        'file',
      ])
      expect(splitPath('path\\to\\file')).toEqual(['path', 'to', 'file'])
    })

    it('should handle empty paths', () => {
      expect(splitPath('')).toEqual([])
    })

    it('should handle single segments', () => {
      expect(splitPath('file')).toEqual(['file'])
      expect(splitPath('/')).toEqual(['', ''])
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

    it('should handle Buffer input', () => {
      expect(splitPath(Buffer.from('a/b/c'))).toEqual(['a', 'b', 'c'])
      expect(splitPath(Buffer.from('path/to/file'))).toEqual([
        'path',
        'to',
        'file',
      ])
    })

    it('should handle URL input', () => {
      expect(splitPath(new URL('file:///a/b/c'))).toEqual(['', 'a', 'b', 'c'])
      expect(splitPath(new URL('file:///path/to/file'))).toEqual([
        '',
        'path',
        'to',
        'file',
      ])
    })

    it('should handle path with multiple slashes', () => {
      const result = splitPath('/a//b///c')
      expect(result).toContain('a')
      expect(result).toContain('b')
      expect(result).toContain('c')
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
  })

  describe('trimLeadingDotSlash', () => {
    it('should trim leading ./ from paths', () => {
      expect(trimLeadingDotSlash('./path/to/file')).toBe('path/to/file')
      expect(trimLeadingDotSlash('./file.txt')).toBe('file.txt')
      expect(trimLeadingDotSlash('./')).toBe('')
      expect(trimLeadingDotSlash('.\\path\\to\\file')).toBe('path\\to\\file')
    })

    it('should not modify paths without ./', () => {
      expect(trimLeadingDotSlash('path/to/file')).toBe('path/to/file')
      expect(trimLeadingDotSlash('/absolute/path')).toBe('/absolute/path')
      expect(trimLeadingDotSlash('../relative')).toBe('../relative')
      expect(trimLeadingDotSlash('')).toBe('')
    })

    it('should only trim from the beginning', () => {
      expect(trimLeadingDotSlash('./path/./to/file')).toBe('path/./to/file')
    })

    it('should handle Windows paths', () => {
      expect(trimLeadingDotSlash('.\\path\\to\\file')).toBe('path\\to\\file')
      expect(trimLeadingDotSlash('.\\path with spaces\\file')).toBe(
        'path with spaces\\file',
      )
    })

    it('should not trim ../ prefix', () => {
      expect(trimLeadingDotSlash('../path/to/file')).toBe('../path/to/file')
      expect(trimLeadingDotSlash('..\\path\\to\\file')).toBe(
        '..\\path\\to\\file',
      )
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

  describe('pathLikeToString', () => {
    it('should convert strings', () => {
      expect(pathLikeToString('/path/to/file')).toBe('/path/to/file')
      expect(pathLikeToString('relative/path')).toBe('relative/path')
      expect(pathLikeToString('')).toBe('')
    })

    it('should convert URL objects', () => {
      const url = new URL('file:///path/to/file')
      const result = pathLikeToString(url)
      expect(typeof result).toBe('string')
      expect(result).toContain('path')
      expect(pathLikeToString(new URL('file:///path/to/file'))).toBe(
        '/path/to/file',
      )
    })

    it('should handle Buffer', () => {
      const buffer = Buffer.from('/path/to/file')
      expect(pathLikeToString(buffer)).toBe('/path/to/file')
      const path = '/path/to/file'
      expect(pathLikeToString(Buffer.from(path))).toBe(path)
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

    it('should convert other types to string', () => {
      // @ts-expect-error - Testing runtime behavior with invalid types.
      expect(pathLikeToString(123)).toBe('123')
      // @ts-expect-error - Testing runtime behavior with invalid types.
      expect(pathLikeToString(true)).toBe('true')
      // @ts-expect-error - Testing runtime behavior with invalid types.
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
        // Should keep pathname as-is regardless of platform.
        expect(result).toBe('/path/to/file')
      } finally {
        require('node:url').fileURLToPath = originalFileURLToPath
        vi.doUnmock('@socketsecurity/registry/lib/constants/win32')
      }
    })

    describe('URL error handling', () => {
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
  })

  describe('relativeResolve', () => {
    it('should resolve relative path between two paths', () => {
      const from = '/path/to/from'
      const to = '/path/to/target'
      expect(relativeResolve(from, to)).toBe('../target')
      const result = relativeResolve('/path/to/file', '/path/to/other')
      expect(result).toBeTruthy()
      expect(typeof result).toBe('string')
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
      const result = relativeResolve('a/b', 'a/c')
      expect(result).toBeTruthy()
    })

    it('should handle same path', () => {
      const path = '/path/to/file'
      expect(relativeResolve(path, path)).toBe('')
      const result = relativeResolve('/path', '/path')
      expect(result).toBe('')
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
  })

  describe('paths with spaces', () => {
    describe('isPath', () => {
      it('should identify Unix paths with spaces', () => {
        expect(isPath('/path with spaces/to/file.js')).toBe(true)
        expect(isPath('./path with spaces/file.js')).toBe(true)
        expect(isPath('../path with spaces/file.js')).toBe(true)
        expect(isPath('relative/path with spaces/file.js')).toBe(true)
        expect(isPath('/path with spaces/file.js')).toBe(true)
      })

      it('should identify Windows paths with spaces', () => {
        expect(isPath('C:\\Program Files\\node\\bin')).toBe(true)
        expect(isPath('C:\\Users\\John Doe\\projects\\test')).toBe(true)
        expect(isPath('path with spaces\\to\\file.js')).toBe(true)
        expect(isPath('C:\\Program Files\\node')).toBe(true)
        expect(isPath('path with spaces\\to\\file')).toBe(true)
      })

      it('should identify user directory paths with spaces', () => {
        expect(isPath('/Users/John Doe/projects/test')).toBe(true)
        expect(isPath('/home/user name/documents')).toBe(true)
      })

      it('should identify relative paths with spaces', () => {
        expect(isPath('my project/src/file.js')).toBe(true)
        expect(isPath('folder with spaces/file.js')).toBe(true)
      })

      it('should handle Buffer with spaces', () => {
        expect(isPath(Buffer.from('/path with spaces/file'))).toBe(true)
      })

      it('should handle URL with spaces', () => {
        expect(isPath(new URL('file:///path%20with%20spaces/file'))).toBe(true)
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
        expect(normalizePath('path with spaces/to/file')).toBe(
          'path with spaces/to/file',
        )
      })

      it('should normalize Windows paths with spaces', () => {
        expect(normalizePath('C:\\Program Files\\node\\bin')).toBe(
          'C:/Program Files/node/bin',
        )
        expect(normalizePath('C:\\Users\\John Doe\\projects\\test')).toBe(
          'C:/Users/John Doe/projects/test',
        )
        expect(normalizePath('path with spaces\\to\\file')).toBe(
          'path with spaces/to/file',
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

      it('should normalize complex paths with spaces', () => {
        expect(normalizePath('/my project/src/../lib/file.js')).toBe(
          '/my project/lib/file.js',
        )
        expect(normalizePath('./my project/./src/./file.js')).toBe(
          'my project/src/file.js',
        )
        expect(normalizePath('C:\\Program Files\\..\\Users\\file')).toBe(
          'C:/Users/file',
        )
      })

      it('should collapse repeated separators with spaces', () => {
        expect(normalizePath('/path with spaces////to/file')).toBe(
          '/path with spaces/to/file',
        )
        expect(normalizePath('path with spaces\\\\\\\\to\\\\file')).toBe(
          'path with spaces/to/file',
        )
      })

      it('should handle relative paths with spaces', () => {
        expect(normalizePath('./my project/file.js')).toBe('my project/file.js')
        expect(normalizePath('../my project/file.js')).toBe(
          '../my project/file.js',
        )
        expect(normalizePath('../../path with spaces/file.js')).toBe(
          '../../path with spaces/file.js',
        )
      })

      it('should handle Buffer with spaces', () => {
        expect(normalizePath(Buffer.from('/path with spaces/file'))).toBe(
          '/path with spaces/file',
        )
      })

      it('should handle URL with spaces', () => {
        const url = new URL('file:///path%20with%20spaces/file')
        const result = normalizePath(url)
        expect(result).toContain('path with spaces')
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
        expect(splitPath('my project/src/index.js')).toEqual([
          'my project',
          'src',
          'index.js',
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
        expect(splitPath('C:\\Program Files\\nodejs')).toEqual([
          'C:',
          'Program Files',
          'nodejs',
        ])
        expect(splitPath('my folder\\sub folder\\file.txt')).toEqual([
          'my folder',
          'sub folder',
          'file.txt',
        ])
      })

      it('should handle Buffer with spaces', () => {
        expect(splitPath(Buffer.from('/path with spaces/file'))).toEqual([
          '',
          'path with spaces',
          'file',
        ])
      })

      it('should handle URL with spaces', () => {
        const result = splitPath(new URL('file:///path%20with%20spaces/file'))
        expect(result).toContain('path with spaces')
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
        expect(trimLeadingDotSlash('./my project/src/file.js')).toBe(
          'my project/src/file.js',
        )
      })

      it('should trim leading .\\ from Windows paths with spaces', () => {
        expect(trimLeadingDotSlash('.\\path with spaces\\to\\file')).toBe(
          'path with spaces\\to\\file',
        )
        expect(trimLeadingDotSlash('.\\Program Files\\node')).toBe(
          'Program Files\\node',
        )
        expect(trimLeadingDotSlash('.\\path with spaces\\file')).toBe(
          'path with spaces\\file',
        )
      })

      it('should not trim ../ from paths with spaces', () => {
        expect(trimLeadingDotSlash('../path with spaces/to/file')).toBe(
          '../path with spaces/to/file',
        )
        expect(trimLeadingDotSlash('..\\path with spaces\\to\\file')).toBe(
          '..\\path with spaces\\to\\file',
        )
        expect(trimLeadingDotSlash('../my project/file.js')).toBe(
          '../my project/file.js',
        )
        expect(trimLeadingDotSlash('..\\path with spaces\\file')).toBe(
          '..\\path with spaces\\file',
        )
      })

      it('should handle Buffer with spaces', () => {
        expect(trimLeadingDotSlash(Buffer.from('./path with spaces'))).toBe(
          'path with spaces',
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
        expect(isNodeModules('/my project/node_modules/pkg')).toBe(true)
      })

      it('should return false for non-node_modules paths with spaces', () => {
        expect(isNodeModules('/path with spaces/src')).toBe(false)
        expect(isNodeModules('C:\\Program Files\\src')).toBe(false)
        expect(isNodeModules('/my project/src')).toBe(false)
      })

      it('should handle Buffer with spaces', () => {
        expect(
          isNodeModules(Buffer.from('/path with spaces/node_modules/pkg')),
        ).toBe(true)
      })

      it('should handle URL with spaces', () => {
        expect(
          isNodeModules(
            new URL('file:///path%20with%20spaces/node_modules/pkg'),
          ),
        ).toBe(true)
      })
    })

    describe('isRelative', () => {
      it('should identify relative paths with spaces', () => {
        expect(isRelative('path with spaces/to/file')).toBe(true)
        expect(isRelative('./path with spaces/file')).toBe(true)
        expect(isRelative('../path with spaces/file')).toBe(true)
        expect(isRelative('my project/src')).toBe(true)
        expect(isRelative('./path with spaces')).toBe(true)
        expect(isRelative('../folder with spaces')).toBe(true)
      })

      it('should identify absolute paths with spaces', () => {
        expect(isRelative('/path with spaces/to/file')).toBe(false)
        expect(isRelative('/path with spaces')).toBe(false)
        if (process.platform === 'win32') {
          expect(isRelative('C:\\Program Files\\node')).toBe(false)
          expect(isRelative('C:\\Program Files')).toBe(false)
        }
      })

      it('should handle Buffer with spaces', () => {
        expect(isRelative(Buffer.from('./path with spaces'))).toBe(true)
        expect(isRelative(Buffer.from('/path with spaces'))).toBe(false)
      })

      it('should handle URL with spaces', () => {
        expect(isRelative(new URL('file:///path%20with%20spaces'))).toBe(false)
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
        const from2 = '/my project/child folder'
        const to2 = '/my project'
        const result = relativeResolve(from2, to2)
        expect(result).toBe('..')
      })

      it('should resolve between paths with spaces', () => {
        const from = '/my project/src'
        const to = '/my project/lib'
        const result = relativeResolve(from, to)
        expect(result).toBe('../lib')
      })

      it('should handle Windows paths with spaces', () => {
        const from = 'C:\\Program Files\\node'
        const to = 'C:\\Program Files\\npm'
        const result = relativeResolve(from, to)
        expect(result).toBeDefined()
        expect(typeof result).toBe('string')
      })
    })
  })

  describe('lazy loading', () => {
    it('should lazy load modules', () => {
      // Clear module caches.
      const pathModule = require('../../registry/dist/lib/path')

      // Test that modules are loaded on demand.
      expect(pathModule.isPath('./test')).toBe(true)
      expect(pathModule.normalizePath('./test')).toBe('test')
      expect(pathModule.pathLikeToString(Buffer.from('test'))).toBe('test')
    })
  })
})
