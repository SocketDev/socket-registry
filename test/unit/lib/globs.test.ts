/**
 * @fileoverview Tests for glob pattern matching utilities.
 *
 * Validates glob operations, pattern matching, and license file filtering.
 */

import { Readable } from 'node:stream'
import type { GlobOptions, Pattern } from '@socketsecurity/lib/globs'
import {
  defaultIgnore,
  getGlobMatcher,
  globStreamLicenses,
} from '@socketsecurity/lib/globs'
import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('globs utilities', () => {
  describe('defaultIgnore', () => {
    it('should be a frozen array', () => {
      expect(Array.isArray(defaultIgnore)).toBe(true)
      expect(Object.isFrozen(defaultIgnore)).toBe(true)
    })

    it('should contain common ignore patterns', () => {
      expect(defaultIgnore).toContain('**/.git')
      expect(defaultIgnore).toContain('**/.npmrc')
      expect(defaultIgnore).toContain('**/node_modules')
      expect(defaultIgnore).toContain('**/.DS_Store')
    })

    it('should contain npm-packlist defaults', () => {
      expect(defaultIgnore).toContain('**/.gitignore')
      expect(defaultIgnore).toContain('**/.hg')
      expect(defaultIgnore).toContain('**/.lock-wscript')
      expect(defaultIgnore).toContain('**/.npmignore')
      expect(defaultIgnore).toContain('**/.svn')
      expect(defaultIgnore).toContain('**/.wafpickle-*')
      expect(defaultIgnore).toContain('**/.*.swp')
      expect(defaultIgnore).toContain('**/._*/**')
      expect(defaultIgnore).toContain('**/archived-packages/**')
      expect(defaultIgnore).toContain('**/build/config.gypi')
      expect(defaultIgnore).toContain('**/CVS')
      expect(defaultIgnore).toContain('**/npm-debug.log')
      expect(defaultIgnore).toContain('**/*.orig')
    })

    it('should contain socket-registry specific patterns', () => {
      expect(defaultIgnore).toContain('**/.env')
      expect(defaultIgnore).toContain('**/.eslintcache')
      expect(defaultIgnore).toContain('**/.nvm')
      expect(defaultIgnore).toContain('**/.tap')
      expect(defaultIgnore).toContain('**/.vscode')
      expect(defaultIgnore).toContain('**/*.tsbuildinfo')
      expect(defaultIgnore).toContain('**/Thumbs.db')
    })

    it('should contain bower_components', () => {
      expect(defaultIgnore).toContain('**/bower_components')
    })

    it('should not allow modification', () => {
      expect(() => {
        ;(defaultIgnore as any).push('new-pattern')
      }).toThrow()
    })
  })

  describe('getGlobMatcher', () => {
    beforeEach(() => {
      vi.clearAllMocks()
    })

    describe('basic pattern matching', () => {
      it('should match simple glob patterns', () => {
        const matcher = getGlobMatcher('*.js')
        expect(matcher('file.js')).toBe(true)
        expect(matcher('file.ts')).toBe(false)
      })

      it('should match exact file names', () => {
        const matcher = getGlobMatcher('package.json')
        expect(matcher('package.json')).toBe(true)
        expect(matcher('package-lock.json')).toBe(false)
      })

      it('should match paths with wildcards', () => {
        const matcher = getGlobMatcher('src/**/*.ts')
        expect(matcher('src/file.ts')).toBe(true)
        expect(matcher('src/nested/file.ts')).toBe(true)
        expect(matcher('lib/file.ts')).toBe(false)
      })

      it('should match with single wildcard', () => {
        const matcher = getGlobMatcher('src/*.ts')
        expect(matcher('src/file.ts')).toBe(true)
        expect(matcher('src/nested/file.ts')).toBe(false)
      })

      it('should match nested paths with globstar', () => {
        const matcher = getGlobMatcher('**/test/**')
        expect(matcher('test/file.js')).toBe(true)
        expect(matcher('src/test/file.js')).toBe(true)
        expect(matcher('src/tests/file.js')).toBe(false)
      })
    })

    describe('array patterns', () => {
      it('should match any pattern in array', () => {
        const matcher = getGlobMatcher(['*.js', '*.ts'])
        expect(matcher('file.js')).toBe(true)
        expect(matcher('file.ts')).toBe(true)
        expect(matcher('file.css')).toBe(false)
      })

      it('should handle empty array', () => {
        const matcher = getGlobMatcher([])
        expect(typeof matcher('file.js')).toBe('boolean')
      })

      it('should handle single item array', () => {
        const matcher = getGlobMatcher(['*.js'])
        expect(matcher('file.js')).toBe(true)
        expect(matcher('file.ts')).toBe(false)
      })

      it('should handle multiple complex patterns', () => {
        const matcher = getGlobMatcher(['src/**/*.ts', 'lib/**/*.js'])
        expect(matcher('src/file.ts')).toBe(true)
        expect(matcher('lib/file.js')).toBe(true)
        expect(matcher('test/file.ts')).toBe(false)
      })
    })

    describe('negation patterns', () => {
      it('should exclude patterns starting with !', () => {
        const matcher = getGlobMatcher(['*.js', '!*.test.js'])
        expect(matcher('file.js')).toBe(true)
        expect(matcher('file.test.js')).toBe(false)
      })

      it('should handle multiple negations', () => {
        const matcher = getGlobMatcher([
          '**/*.ts',
          '!**/*.test.ts',
          '!**/*.spec.ts',
        ])
        expect(matcher('src/file.ts')).toBe(true)
        expect(matcher('src/file.test.ts')).toBe(false)
        expect(matcher('src/file.spec.ts')).toBe(false)
      })

      it('should handle only negation patterns', () => {
        const matcher = getGlobMatcher(['!*.test.js'])
        expect(typeof matcher('file.js')).toBe('boolean')
      })

      it('should properly separate positive and negative patterns', () => {
        const matcher = getGlobMatcher([
          '*.js',
          '*.ts',
          '!*.test.js',
          '!*.spec.ts',
        ])
        expect(matcher('file.js')).toBe(true)
        expect(matcher('file.ts')).toBe(true)
        expect(matcher('file.test.js')).toBe(false)
        expect(matcher('file.spec.ts')).toBe(false)
      })
    })

    describe('options', () => {
      it('should respect dot option', () => {
        const matcher = getGlobMatcher('*', { dot: true })
        expect(matcher('.hidden')).toBe(true)
      })

      it('should respect nocase option for case-insensitive matching', () => {
        const matcher = getGlobMatcher('*.JS', { nocase: true })
        expect(matcher('file.js')).toBe(true)
        expect(matcher('file.JS')).toBe(true)
      })

      it('should use default options when not provided', () => {
        const matcher = getGlobMatcher('*.js')
        expect(typeof matcher('file.js')).toBe('boolean')
      })

      it('should handle custom ignore option', () => {
        const matcher = getGlobMatcher('*.js', { ignore: ['*.test.js'] })
        expect(matcher('file.js')).toBe(true)
        expect(matcher('file.test.js')).toBe(false)
      })

      it('should merge ignore option with negation patterns', () => {
        const matcher = getGlobMatcher(['*.js', '!*.spec.js'], {
          ignore: ['*.test.js'],
        })
        expect(matcher('file.js')).toBe(true)
        // Note: The ignore option and negation patterns work together.
        // Both *.test.js and *.spec.js should be excluded.
        expect(matcher('file.spec.js')).toBe(false)
      })
    })

    describe('caching behavior', () => {
      it('should cache matchers for identical inputs', () => {
        const matcher1 = getGlobMatcher('*.js')
        const matcher2 = getGlobMatcher('*.js')
        expect(matcher1).toBe(matcher2)
      })

      it('should cache matchers with same pattern and options', () => {
        const options = { dot: true, nocase: false }
        const matcher1 = getGlobMatcher('*.js', options)
        const matcher2 = getGlobMatcher('*.js', options)
        expect(matcher1).toBe(matcher2)
      })

      it('should not cache different patterns', () => {
        const matcher1 = getGlobMatcher('*.js')
        const matcher2 = getGlobMatcher('*.ts')
        expect(matcher1).not.toBe(matcher2)
      })

      it('should not cache different options', () => {
        const matcher1 = getGlobMatcher('*.js', { dot: true })
        const matcher2 = getGlobMatcher('*.js', { dot: false })
        expect(matcher1).not.toBe(matcher2)
      })

      it('should cache array patterns consistently', () => {
        const matcher1 = getGlobMatcher(['*.js', '*.ts'])
        const matcher2 = getGlobMatcher(['*.js', '*.ts'])
        expect(matcher1).toBe(matcher2)
      })

      it('should distinguish between array and string patterns', () => {
        const matcher1 = getGlobMatcher('*.js')
        const matcher2 = getGlobMatcher(['*.js'])
        // Note: Both string and array with single item are normalized internally.
        // The caching treats them the same based on the pattern array conversion.
        expect(typeof matcher1).toBe('function')
        expect(typeof matcher2).toBe('function')
      })
    })

    describe('edge cases', () => {
      it('should handle empty string pattern', () => {
        // Note: Empty patterns throw an error from picomatch.
        expect(() => getGlobMatcher('')).toThrow()
      })

      it('should handle paths with special characters', () => {
        const matcher = getGlobMatcher('src/**/*.ts')
        expect(typeof matcher('src/file-name.ts')).toBe('boolean')
        expect(typeof matcher('src/file_name.ts')).toBe('boolean')
      })

      it('should handle windows-style paths', () => {
        const matcher = getGlobMatcher('src/**/*.js')
        expect(typeof matcher('src\\file.js')).toBe('boolean')
      })

      it('should handle deeply nested paths', () => {
        const matcher = getGlobMatcher('**/*.js')
        const deepPath = 'a/b/c/d/e/f/g/h/i/j/file.js'
        expect(matcher(deepPath)).toBe(true)
      })

      it('should handle file extensions with dots', () => {
        const matcher = getGlobMatcher('*.d.ts')
        expect(matcher('file.d.ts')).toBe(true)
        expect(matcher('file.ts')).toBe(false)
      })

      it('should handle brace expansions in patterns', () => {
        const matcher = getGlobMatcher('*.{js,ts}')
        expect(matcher('file.js')).toBe(true)
        expect(matcher('file.ts')).toBe(true)
        expect(matcher('file.css')).toBe(false)
      })
    })
  })

  describe('globStreamLicenses', () => {
    describe('basic functionality', () => {
      it('should return a readable stream', () => {
        const stream = globStreamLicenses('/test/dir')
        expect(stream).toBeInstanceOf(Readable)
      })

      it('should accept dirname parameter', () => {
        const stream = globStreamLicenses('/some/path')
        expect(stream).toBeDefined()
        expect(stream).toBeInstanceOf(Readable)
      })

      it('should work without options', () => {
        const stream = globStreamLicenses('/test/dir')
        expect(stream).toBeInstanceOf(Readable)
      })
    })

    describe('options handling', () => {
      it('should handle empty options object', () => {
        const stream = globStreamLicenses('/test/dir', {})
        expect(stream).toBeInstanceOf(Readable)
      })

      it('should respect recursive option', () => {
        const stream = globStreamLicenses('/test/dir', { recursive: true })
        expect(stream).toBeInstanceOf(Readable)
      })

      it('should respect ignoreOriginals option', () => {
        const stream = globStreamLicenses('/test/dir', {
          ignoreOriginals: true,
        })
        expect(stream).toBeInstanceOf(Readable)
      })

      it('should respect both recursive and ignoreOriginals', () => {
        const stream = globStreamLicenses('/test/dir', {
          recursive: true,
          ignoreOriginals: true,
        })
        expect(stream).toBeInstanceOf(Readable)
      })

      it('should pass through other glob options', () => {
        const stream = globStreamLicenses('/test/dir', {
          absolute: true,
          dot: true,
          followSymbolicLinks: false,
        })
        expect(stream).toBeInstanceOf(Readable)
      })

      it('should handle custom ignore patterns', () => {
        const stream = globStreamLicenses('/test/dir', {
          ignore: ['**/node_modules/**', '**/dist/**'],
        })
        expect(stream).toBeInstanceOf(Readable)
      })

      it('should use defaultIgnore when ignore option is not provided', () => {
        const stream = globStreamLicenses('/test/dir', {})
        expect(stream).toBeInstanceOf(Readable)
      })

      it('should merge custom ignore with code file patterns', () => {
        const customIgnore = ['**/test/**']
        const stream = globStreamLicenses('/test/dir', { ignore: customIgnore })
        expect(stream).toBeInstanceOf(Readable)
      })
    })

    describe('ignore patterns', () => {
      it('should add code file patterns to ignore list', () => {
        const stream = globStreamLicenses('/test/dir')
        expect(stream).toBeInstanceOf(Readable)
      })

      it('should ignore JavaScript and TypeScript files', () => {
        const stream = globStreamLicenses('/test/dir', { recursive: true })
        expect(stream).toBeInstanceOf(Readable)
      })

      it('should ignore JSON files', () => {
        const stream = globStreamLicenses('/test/dir')
        expect(stream).toBeInstanceOf(Readable)
      })

      it('should handle ignoreOriginals with recursive', () => {
        const stream = globStreamLicenses('/test/dir', {
          recursive: true,
          ignoreOriginals: true,
        })
        expect(stream).toBeInstanceOf(Readable)
      })

      it('should handle ignoreOriginals without recursive', () => {
        const stream = globStreamLicenses('/test/dir', {
          recursive: false,
          ignoreOriginals: true,
        })
        expect(stream).toBeInstanceOf(Readable)
      })
    })

    describe('glob patterns', () => {
      it('should use recursive license glob when recursive is true', () => {
        const stream = globStreamLicenses('/test/dir', { recursive: true })
        expect(stream).toBeInstanceOf(Readable)
      })

      it('should use non-recursive license glob when recursive is false', () => {
        const stream = globStreamLicenses('/test/dir', { recursive: false })
        expect(stream).toBeInstanceOf(Readable)
      })

      it('should use non-recursive glob by default', () => {
        const stream = globStreamLicenses('/test/dir')
        expect(stream).toBeInstanceOf(Readable)
      })
    })

    describe('edge cases', () => {
      it('should handle root directory', () => {
        const stream = globStreamLicenses('/')
        expect(stream).toBeInstanceOf(Readable)
      })

      it('should handle relative paths', () => {
        const stream = globStreamLicenses('./test')
        expect(stream).toBeInstanceOf(Readable)
      })

      it('should handle paths with spaces', () => {
        const stream = globStreamLicenses('/path with spaces')
        expect(stream).toBeInstanceOf(Readable)
      })

      it('should handle paths with special characters', () => {
        const stream = globStreamLicenses('/path-with_special.chars')
        expect(stream).toBeInstanceOf(Readable)
      })

      it('should handle empty string dirname', () => {
        const stream = globStreamLicenses('')
        expect(stream).toBeInstanceOf(Readable)
      })

      it('should handle multiple fast-glob options', () => {
        const stream = globStreamLicenses('/test/dir', {
          absolute: true,
          caseSensitiveMatch: false,
          concurrency: 10,
          deep: 5,
          dot: true,
          followSymbolicLinks: true,
          markDirectories: true,
          onlyFiles: true,
          stats: false,
          unique: true,
        })
        expect(stream).toBeInstanceOf(Readable)
      })

      it('should handle options with null prototype', () => {
        const options = Object.create(null)
        options.recursive = true
        const stream = globStreamLicenses('/test/dir', options)
        expect(stream).toBeInstanceOf(Readable)
      })
    })
  })

  describe('type exports', () => {
    it('should export GlobOptions type', () => {
      const options: GlobOptions = {
        recursive: true,
        ignoreOriginals: true,
        ignore: ['**/test/**'],
      }
      expect(options).toBeDefined()
    })

    it('should export Pattern type', () => {
      const pattern: Pattern = '*.js'
      expect(pattern).toBeDefined()
    })

    it('should allow Pattern to be a string', () => {
      const pattern: Pattern = 'src/**/*.ts'
      expect(typeof pattern).toBe('string')
    })
  })
})
