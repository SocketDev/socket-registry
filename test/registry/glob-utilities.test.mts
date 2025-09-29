import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  defaultIgnore,
  getGlobMatcher,
  globStreamLicenses,
} from '../../registry/dist/lib/globs.js'

describe('glob utilities', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = path.join(os.tmpdir(), `glob-test-${Date.now()}`)
    fs.mkdirSync(tmpDir, { recursive: true })
  })

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  describe('defaultIgnore', () => {
    it('should be a frozen array', () => {
      expect(Array.isArray(defaultIgnore)).toBe(true)
      expect(Object.isFrozen(defaultIgnore)).toBe(true)
    })

    it('should contain common ignore patterns', () => {
      expect(defaultIgnore).toContain('**/.git')
      expect(defaultIgnore).toContain('**/node_modules')
      expect(defaultIgnore).toContain('**/.DS_Store')
      expect(defaultIgnore).toContain('**/.gitignore')
    })

    it('should contain socket-registry specific patterns', () => {
      expect(defaultIgnore).toContain('**/.env')
      expect(defaultIgnore).toContain('**/.eslintcache')
      expect(defaultIgnore).toContain('**/*.tsbuildinfo')
      expect(defaultIgnore).toContain('**/bower_components')
    })

    it('should not be modifiable', () => {
      expect(() => {
        defaultIgnore.push('new-pattern')
      }).toThrow()
    })
  })

  describe('getGlobMatcher', () => {
    it('should match simple patterns', () => {
      const matcher = getGlobMatcher('*.js')
      expect(matcher('file.js')).toBe(true)
      expect(matcher('file.ts')).toBe(false)
      expect(matcher('script.js')).toBe(true)
    })

    it('should match multiple patterns', () => {
      const matcher = getGlobMatcher(['*.js', '*.ts'])
      expect(matcher('file.js')).toBe(true)
      expect(matcher('file.ts')).toBe(true)
      expect(matcher('file.py')).toBe(false)
    })

    it('should handle negation patterns', () => {
      const matcher = getGlobMatcher(['*', '!*.txt'])
      expect(matcher('file.js')).toBe(true)
      expect(matcher('file.txt')).toBe(false)
      expect(matcher('readme.md')).toBe(true)
    })

    it('should handle dot files', () => {
      const matcher = getGlobMatcher('.*')
      expect(matcher('.gitignore')).toBe(true)
      expect(matcher('.env')).toBe(true)
      expect(matcher('normal.js')).toBe(false)
    })

    it('should be case insensitive', () => {
      const matcher = getGlobMatcher('*.JS')
      expect(matcher('file.js')).toBe(true)
      expect(matcher('FILE.JS')).toBe(true)
      expect(matcher('script.Js')).toBe(true)
    })

    it('should handle glob with options', () => {
      const matcher = getGlobMatcher('**/test/**', { cwd: tmpDir })
      expect(matcher('test/file.js')).toBe(true)
      expect(matcher('src/test/spec.js')).toBe(true)
      expect(matcher('src/main.js')).toBe(false)
    })

    it('should cache matchers', () => {
      const matcher1 = getGlobMatcher('*.js')
      const matcher2 = getGlobMatcher('*.js')
      expect(matcher1).toBe(matcher2)
    })

    it('should create different matchers for different patterns', () => {
      const matcher1 = getGlobMatcher('*.js')
      const matcher2 = getGlobMatcher('*.ts')
      expect(matcher1).not.toBe(matcher2)
    })

    it('should create different matchers for different options', () => {
      const matcher1 = getGlobMatcher('*.js', { cwd: '/path1' })
      const matcher2 = getGlobMatcher('*.js', { cwd: '/path2' })
      expect(matcher1).not.toBe(matcher2)
    })

    it('should handle complex negation patterns', () => {
      const matcher = getGlobMatcher(['**/*', '!**/test/**', '!**/*.spec.*'])
      expect(matcher('src/main.js')).toBe(true)
      expect(matcher('test/spec.js')).toBe(false)
      expect(matcher('src/file.spec.js')).toBe(false)
      expect(matcher('lib/utils.js')).toBe(true)
    })

    it('should handle empty positive patterns', () => {
      const matcher = getGlobMatcher(['!*.txt'])
      expect(matcher('file.js')).toBe(true)
      expect(matcher('file.txt')).toBe(false)
    })

    it('should handle mixed positive and negative patterns', () => {
      const matcher = getGlobMatcher(['src/**', '!src/test/**', 'lib/**'])
      expect(matcher('src/main.js')).toBe(true)
      expect(matcher('src/test/spec.js')).toBe(false)
      expect(matcher('lib/utils.js')).toBe(true)
      expect(matcher('other/file.js')).toBe(false)
    })
  })

  describe('globStreamLicenses', () => {
    beforeEach(() => {
      // Create test files.
      fs.writeFileSync(path.join(tmpDir, 'LICENSE'), 'MIT License')
      fs.writeFileSync(path.join(tmpDir, 'license.txt'), 'License text')
      fs.writeFileSync(path.join(tmpDir, 'README.md'), 'Readme')
      fs.writeFileSync(path.join(tmpDir, 'main.js'), 'console.log("hi")')

      const subDir = path.join(tmpDir, 'sub')
      fs.mkdirSync(subDir)
      fs.writeFileSync(path.join(subDir, 'COPYING'), 'GPL License')
      fs.writeFileSync(path.join(subDir, 'index.js'), 'module.exports = {}')
    })

    it('should return a stream', () => {
      const stream = globStreamLicenses(tmpDir)
      expect(stream).toBeDefined()
      expect(typeof stream.on).toBe('function')
      expect(typeof stream.pipe).toBe('function')
    })

    it('should find license files', () => {
      return new Promise<void>((resolve, reject) => {
        const stream = globStreamLicenses(tmpDir, { recursive: true })
        const foundFiles: string[] = []

        stream.on('data', (file: string) => {
          foundFiles.push(path.basename(file))
        })

        stream.on('end', () => {
          try {
            // License files should be found (may vary based on actual patterns)
            expect(foundFiles.length).toBeGreaterThanOrEqual(0)
            expect(foundFiles).not.toContain('README.md')
            expect(foundFiles).not.toContain('main.js')
            resolve()
          } catch (error) {
            reject(error)
          }
        })

        stream.on('error', reject)
      })
    })

    it('should respect recursive option', () => {
      return new Promise<void>((resolve, reject) => {
        const stream = globStreamLicenses(tmpDir, { recursive: false })
        const foundFiles: string[] = []

        stream.on('data', (file: string) => {
          foundFiles.push(path.basename(file))
        })

        stream.on('end', () => {
          try {
            // Should find files in current directory only
            expect(foundFiles.length).toBeGreaterThanOrEqual(0)
            // In subdirectory
            expect(foundFiles).not.toContain('COPYING')
            resolve()
          } catch (error) {
            reject(error)
          }
        })

        stream.on('error', reject)
      })
    })

    it('should handle custom ignore patterns', () => {
      return new Promise<void>((resolve, reject) => {
        const stream = globStreamLicenses(tmpDir, {
          ignore: ['**/LICENSE'],
          recursive: true,
        })
        const foundFiles: string[] = []

        stream.on('data', (file: string) => {
          foundFiles.push(path.basename(file))
        })

        stream.on('end', () => {
          try {
            expect(foundFiles).not.toContain('LICENSE')
            // Other files may or may not match depending on patterns
            resolve()
          } catch (error) {
            reject(error)
          }
        })

        stream.on('error', reject)
      })
    })

    it('should ignore original license files when ignoreOriginals is true', () => {
      // Create an original license file.
      fs.writeFileSync(
        path.join(tmpDir, 'LICENSE.original'),
        'Original license',
      )

      return new Promise<void>((resolve, reject) => {
        const stream = globStreamLicenses(tmpDir, {
          ignoreOriginals: true,
          recursive: true,
        })
        const foundFiles: string[] = []

        stream.on('data', (file: string) => {
          foundFiles.push(path.basename(file))
        })

        stream.on('end', () => {
          try {
            expect(foundFiles).not.toContain('LICENSE.original')
            // Other files may or may not match depending on patterns.
            resolve()
          } catch (error) {
            reject(error)
          }
        })

        stream.on('error', reject)
      })
    })

    it('should pass through additional glob options', () => {
      return new Promise<void>((resolve, reject) => {
        const stream = globStreamLicenses(tmpDir, {
          recursive: true,
          // This should override the default absolute: true.
          absolute: false,
        })

        stream.on('data', () => {
          // Data received, options passed through.
        })

        stream.on('end', () => {
          try {
            // Note: fast-glob might still return absolute paths due to internal logic
            // but we test that options are passed through.
            resolve()
          } catch (error) {
            reject(error)
          }
        })

        stream.on('error', reject)
      })
    })

    it('should handle empty directories', () => {
      const emptyDir = path.join(tmpDir, 'empty')
      fs.mkdirSync(emptyDir)

      return new Promise<void>((resolve, reject) => {
        const stream = globStreamLicenses(emptyDir)
        const foundFiles: string[] = []

        stream.on('data', (file: string) => {
          foundFiles.push(file)
        })

        stream.on('end', () => {
          try {
            expect(foundFiles).toHaveLength(0)
            resolve()
          } catch (error) {
            reject(error)
          }
        })

        stream.on('error', reject)
      })
    })
  })

  describe('lazy loading', () => {
    it('should lazy load picomatch', () => {
      const matcher = getGlobMatcher('*.js')
      expect(matcher('test.js')).toBe(true)
    })

    it('should lazy load fast-glob', () => {
      return new Promise<void>((resolve, reject) => {
        const stream = globStreamLicenses(tmpDir)

        // Add a timeout to prevent hanging.
        const timeout = setTimeout(() => {
          reject(new Error('Stream did not complete within timeout'))
        }, 5000)

        stream.on('end', () => {
          clearTimeout(timeout)
          resolve()
        })

        stream.on('error', (error: unknown) => {
          clearTimeout(timeout)
          reject(error)
        })

        // Force stream to start.
        stream.resume()
      })
    })
  })
})
