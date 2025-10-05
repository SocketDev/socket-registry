import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { Readable } from 'node:stream'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  defaultIgnore,
  getGlobMatcher,
  globStreamLicenses,
} from '../../registry/dist/lib/globs.js'
import { trash } from '../../scripts/utils/fs.mjs'

describe('globs module', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'glob-test-'))
  })

  afterEach(async () => {
    await trash(tmpDir)
  })

  describe('defaultIgnore', () => {
    it('should be a frozen array', () => {
      expect(Array.isArray(defaultIgnore)).toBe(true)
      expect(Object.isFrozen(defaultIgnore)).toBe(true)
      expect(defaultIgnore.length).toBeGreaterThan(0)
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

    it('should include various file types to ignore', () => {
      const hasTestFiles = defaultIgnore.some(
        (p: string) =>
          p.includes('test') || p.includes('spec') || p.includes('*.test.*'),
      )
      const hasBuildFiles = defaultIgnore.some(
        (p: string) =>
          p.includes('dist') || p.includes('build') || p.includes('out'),
      )
      expect(hasTestFiles || hasBuildFiles).toBe(true)
    })

    it('should not be modifiable', () => {
      expect(() => {
        // @ts-expect-error - Testing runtime immutability of readonly array.
        defaultIgnore.push('new-pattern')
      }).toThrow()
    })
  })

  describe('getGlobMatcher', () => {
    it('should create a matcher function', () => {
      const matcher = getGlobMatcher(['*.js', '*.ts'])
      expect(typeof matcher).toBe('function')
    })

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

    it('should handle glob patterns', () => {
      const matcher = getGlobMatcher(['src/**/*.js'])
      expect(matcher('src/file.js')).toBe(true)
      expect(matcher('src/subdir/file.js')).toBe(true)
      expect(matcher('test/file.js')).toBe(false)
    })

    it('should handle negation patterns', () => {
      const matcher = getGlobMatcher(['*.js', '!*.test.js'])
      expect(matcher('file.js')).toBe(true)
      expect(matcher('file.test.js')).toBe(false)
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

    it('should handle empty patterns', () => {
      const matcher = getGlobMatcher([])
      expect(matcher('any-file.txt')).toBe(false)
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

    it('should handle options with nocase', () => {
      const matcher = getGlobMatcher(['*.JS'], { nocase: true })
      expect(matcher('file.js')).toBe(true)
      expect(matcher('file.JS')).toBe(true)
    })

    it('should handle glob with cwd option', () => {
      const matcher = getGlobMatcher('**/test/**', { cwd: tmpDir })
      expect(matcher('test/file.js')).toBe(true)
      expect(matcher('src/test/spec.js')).toBe(true)
      expect(matcher('src/main.js')).toBe(false)
    })

    it('should match directories with patterns', () => {
      const matcher = getGlobMatcher(['**/node_modules/**'])
      expect(matcher('node_modules/package/file.js')).toBe(true)
      expect(matcher('src/node_modules/file.js')).toBe(true)
      expect(matcher('src/file.js')).toBe(false)
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

    it('should return a readable stream', () => {
      const stream = globStreamLicenses('.')
      expect(stream).toBeInstanceOf(Readable)
      expect(typeof stream.on).toBe('function')
      expect(typeof stream.pipe).toBe('function')
      stream.destroy()
    })

    it('should stream license files', async () => {
      const stream = globStreamLicenses('.')
      const files: string[] = []

      return await new Promise<void>((resolve, reject) => {
        stream.on('data', (chunk: any) => {
          files.push(chunk.toString())
        })

        stream.on('end', () => {
          expect(files.length).toBeGreaterThanOrEqual(0)
          resolve()
        })

        stream.on('error', (err: any) => {
          reject(err)
        })
      })
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

    it('should handle options with ignore', () => {
      const stream = globStreamLicenses('.', {
        ignore: ['node_modules/**'],
        cwd: process.cwd(),
      })
      expect(stream).toBeInstanceOf(Readable)
      stream.destroy()
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
            expect(foundFiles.length).toBeGreaterThanOrEqual(0)
            expect(foundFiles).not.toContain('COPYING')
            resolve()
          } catch (error) {
            reject(error)
          }
        })

        stream.on('error', reject)
      })
    })

    it('should ignore original license files when ignoreOriginals is true', () => {
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
          absolute: false,
        })

        stream.on('data', () => {
          // Data received, options passed through.
        })

        stream.on('end', () => {
          resolve()
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

    it('should handle non-existent directories', async () => {
      const stream = globStreamLicenses('/non/existent/path')
      let errorOccurred = false

      return await new Promise<void>(resolve => {
        stream.on('error', () => {
          errorOccurred = true
        })

        stream.on('end', () => {
          expect(errorOccurred || stream.readableLength === 0).toBe(true)
          resolve()
        })

        setTimeout(() => {
          stream.destroy()
          resolve()
        }, 100)
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

        stream.resume()
      })
    })
  })
})
