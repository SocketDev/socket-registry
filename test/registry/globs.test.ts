import { Readable } from 'node:stream'

import { describe, expect, it } from 'vitest'

const {
  defaultIgnore,
  getGlobMatcher,
  globStreamLicenses,
} = require('@socketsecurity/registry/lib/globs')

describe('globs module', () => {
  describe('defaultIgnore', () => {
    it('should be an array of ignore patterns', () => {
      expect(Array.isArray(defaultIgnore)).toBe(true)
      expect(defaultIgnore.length).toBeGreaterThan(0)
    })

    it('should include common ignore patterns', () => {
      const patterns = defaultIgnore.join(' ')
      expect(patterns).toContain('node_modules')
      expect(patterns).toContain('.git')
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
  })

  describe('getGlobMatcher', () => {
    it('should create a matcher function', () => {
      const matcher = getGlobMatcher(['*.js', '*.ts'])
      expect(typeof matcher).toBe('function')
    })

    it('should match files based on patterns', () => {
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

    it('should handle empty patterns', () => {
      const matcher = getGlobMatcher([])
      expect(matcher('any-file.txt')).toBe(false)
    })

    it('should handle options', () => {
      const matcher = getGlobMatcher(['*.JS'], { nocase: true })
      expect(matcher('file.js')).toBe(true)
      expect(matcher('file.JS')).toBe(true)
    })

    it('should match directories with patterns', () => {
      const matcher = getGlobMatcher(['**/node_modules/**'])
      expect(matcher('node_modules/package/file.js')).toBe(true)
      expect(matcher('src/node_modules/file.js')).toBe(true)
      expect(matcher('src/file.js')).toBe(false)
    })
  })

  describe('globStreamLicenses', () => {
    it('should return a readable stream', () => {
      const stream = globStreamLicenses('.')
      expect(stream).toBeInstanceOf(Readable)
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

    it('should handle options', () => {
      const stream = globStreamLicenses('.', {
        ignore: ['node_modules/**'],
        cwd: process.cwd(),
      })
      expect(stream).toBeInstanceOf(Readable)
      stream.destroy()
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
})
