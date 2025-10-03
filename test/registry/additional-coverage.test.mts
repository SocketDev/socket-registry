import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { trash } from '../../scripts/utils/fs.mjs'

// Helper predicate moved to outer scope.
const pFilterPredicate = async (value: number) => {
  await new Promise(r => setTimeout(r, 5))
  return value % 2 === 0
}

// Additional tests for maximum coverage
describe('additional coverage tests', () => {
  describe('fs module extended tests', () => {
    const fsUtils = require('../../registry/dist/lib/fs')
    let tmpDir: string

    beforeEach(async () => {
      tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fs-test-'))
    })

    afterEach(async () => {
      await trash(tmpDir)
    })

    it('should handle findUp with multiple patterns', async () => {
      const testFile = path.join(tmpDir, 'package.json')
      await fs.writeFile(testFile, '{}')

      const result = await fsUtils.findUp('package.json', { cwd: tmpDir })
      expect(result).toBe(testFile)
    })

    it('should handle findUpSync edge cases', () => {
      const result = fsUtils.findUpSync('definitely-does-not-exist.xyz', {
        cwd: tmpDir,
        stopAt: tmpDir,
      })
      expect(result).toBe(undefined)
    })

    it('should handle readDirNames with filters', async () => {
      await fs.mkdir(path.join(tmpDir, 'dir1'))
      await fs.mkdir(path.join(tmpDir, '.hidden'))
      await fs.writeFile(path.join(tmpDir, 'file.txt'), 'test')
      // Add files to directories so they're not empty
      await fs.writeFile(path.join(tmpDir, 'dir1', 'test.txt'), 'content')
      await fs.writeFile(path.join(tmpDir, '.hidden', 'test.txt'), 'content')

      const dirs = await fsUtils.readDirNames(tmpDir)
      expect(dirs).toContain('dir1')
      expect(dirs).not.toContain('file.txt')

      // Test with includeEmpty option
      await fs.mkdir(path.join(tmpDir, 'empty-dir'))
      const dirsWithEmpty = await fsUtils.readDirNames(tmpDir, {
        includeEmpty: true,
      })
      expect(dirsWithEmpty).toContain('empty-dir')
    })

    it('should handle writeJson with different options', async () => {
      const jsonPath = path.join(tmpDir, 'test.json')
      const data = { a: 1, b: [2, 3], c: { d: 4 } }

      await fsUtils.writeJson(jsonPath, data, {
        spaces: 4,
        replacer: ['a', 'c'],
      })

      const content = await fs.readFile(jsonPath, 'utf8')
      const parsed = JSON.parse(content)
      expect(parsed.a).toBe(1)
      // filtered by replacer
      expect(parsed.b).toBeUndefined()
      // 4 spaces
      expect(content).toContain('    ')
    })

    it('should handle uniqueSync with directories', () => {
      const dirPath = path.join(tmpDir, 'mydir')
      const unique1 = fsUtils.uniqueSync(dirPath)
      expect(unique1).toBe(dirPath)

      // Create the directory
      require('node:fs').mkdirSync(dirPath)
      const unique2 = fsUtils.uniqueSync(dirPath)
      expect(unique2).toBe(path.join(tmpDir, 'mydir-1'))

      // Create another file with same name to test multiple suffixes
      require('node:fs').mkdirSync(unique2)
      const unique3 = fsUtils.uniqueSync(dirPath)
      expect(unique3).toBe(path.join(tmpDir, 'mydir-2'))
    })

    it('should handle safeReadFile with different encodings', async () => {
      const filePath = path.join(tmpDir, 'test.txt')
      await fs.writeFile(filePath, 'Hello World')

      const buffer = await fsUtils.safeReadFile(filePath)
      expect(Buffer.isBuffer(buffer)).toBe(true)

      const text = await fsUtils.safeReadFile(filePath, 'utf8')
      expect(text).toBe('Hello World')

      const missing = await fsUtils.safeReadFile(
        path.join(tmpDir, 'missing.txt'),
      )
      expect(missing).toBe(undefined)
    })
  })

  describe('packages module extended tests', () => {
    const packages = require('../../registry/dist/lib/packages')

    it('should handle getSubpaths with complex exports', () => {
      const exports = {
        '.': './index.js',
        './sub': {
          import: './sub.mjs',
          require: './sub.cjs',
          default: './sub.js',
        },
        './utils/*': './utils/*.js',
        './package.json': './package.json',
      }

      const subpaths = packages.getSubpaths(exports)
      expect(subpaths).toContain('.')
      expect(subpaths).toContain('./sub')
      expect(subpaths).toContain('./utils/*')
      expect(subpaths).toContain('./package.json')
    })

    it('should check conditional exports correctly', () => {
      expect(
        packages.isConditionalExports({
          import: './index.mjs',
          require: './index.cjs',
          types: './index.d.ts',
        }),
      ).toBe(true)

      expect(
        packages.isConditionalExports({
          node: { import: './node.mjs' },
          browser: './browser.js',
        }),
      ).toBe(true)

      expect(packages.isConditionalExports(['./index.js'])).toBe(false)
    })

    it('should check subpath exports', () => {
      expect(
        packages.isSubpathExports({
          '.': './index.js',
          './feature': './feature.js',
        }),
      ).toBe(true)

      expect(
        packages.isSubpathExports({
          import: './index.mjs',
          require: './index.cjs',
        }),
      ).toBe(false)
    })

    it('should get release tags correctly', () => {
      expect(packages.getReleaseTag('pkg@latest')).toBe('latest')
      expect(packages.getReleaseTag('pkg@1.2.3')).toBe('1.2.3')
      expect(packages.getReleaseTag('@scope/pkg@next')).toBe('next')
      expect(packages.getReleaseTag('pkg')).toBe('')
    })

    it('should normalize package.json data', () => {
      const input = {
        name: 'test-pkg',
        version: '1.0.0',
        dependencies: {
          lodash: '^4.17.0',
          react: '18.0.0',
        },
        scripts: {
          test: 'vitest',
          build: 'tsc',
        },
      }

      const normalized = packages.normalizePackageJson(input)
      expect(normalized.name).toBe('test-pkg')
      expect(normalized.version).toBe('1.0.0')
      expect(normalized.dependencies).toEqual(input.dependencies)
      expect(normalized.scripts).toEqual(input.scripts)
    })

    it('should handle isBlessedPackageName', () => {
      // Just verify it returns boolean
      expect(typeof packages.isBlessedPackageName('typescript')).toBe('boolean')
      expect(typeof packages.isBlessedPackageName('unknown-pkg-xyz')).toBe(
        'boolean',
      )
    })
  })

  describe('promises module extended tests', () => {
    const promises = require('../../registry/dist/lib/promises')

    it('should handle pEach with different options', async () => {
      const results: number[] = []
      const fn = async (value: number) => {
        await new Promise(r => setTimeout(r, 10))
        results.push(value * 2)
      }

      await promises.pEach([1, 2, 3, 4, 5], fn, { concurrency: 2 })
      expect(results.sort((a, b) => a - b)).toEqual([2, 4, 6, 8, 10])
    })

    it('should handle pFilter with async predicate', async () => {
      const result = await promises.pFilter(
        [1, 2, 3, 4, 5, 6],
        pFilterPredicate,
        {
          concurrency: 3,
        },
      )
      expect(result).toEqual([2, 4, 6])
    })

    it('should handle pRetry with immediate success', async () => {
      const fn = vi.fn().mockResolvedValue('success')
      const result = await promises.pRetry(fn, { retries: 3 })
      expect(result).toBe('success')
      expect(fn).toHaveBeenCalledTimes(1)
    })

    it('should normalize iteration options', () => {
      const opts1 = promises.normalizeIterationOptions()
      expect(opts1.concurrency).toBeGreaterThan(0)

      const opts2 = promises.normalizeIterationOptions({ concurrency: 5 })
      expect(opts2.concurrency).toBe(5)

      const opts3 = promises.normalizeIterationOptions(10)
      expect(opts3.concurrency).toBe(10)
    })

    it('should resolve retry options', () => {
      const opts1 = promises.resolveRetryOptions()
      expect(opts1).toHaveProperty('retries')
      expect(opts1).toHaveProperty('minTimeout')

      const opts2 = promises.resolveRetryOptions({
        retries: 5,
        factor: 2,
        minTimeout: 100,
        maxTimeout: 5000,
      })
      expect(opts2.retries).toBe(5)
      expect(opts2.factor).toBe(2)
    })
  })

  describe('url module extended tests', () => {
    const urlUtils = require('../../registry/dist/lib/url')

    it('should handle URL creation', () => {
      const url = urlUtils.createRelativeUrl('/path/to/resource')
      expect(url).toBe('path/to/resource')

      const url2 = urlUtils.createRelativeUrl('resource', '/base/')
      expect(url2).toBe('/base/resource')
    })

    it('should work with URLSearchParams', () => {
      const params = new URLSearchParams('a=1&b=2&c=3')

      expect(urlUtils.urlSearchParamAsString(params, 'a')).toBe('1')
      expect(
        urlUtils.urlSearchParamAsString(params, 'missing', 'default'),
      ).toBe('default')

      expect(urlUtils.urlSearchParamAsNumber(params, 'b')).toBe(2)
      expect(urlUtils.urlSearchParamAsNumber(params, 'missing', 99)).toBe(99)

      const boolParams = new URLSearchParams('enabled=true&disabled=false')
      expect(urlUtils.urlSearchParamsGetBoolean(boolParams, 'enabled')).toBe(
        true,
      )
      expect(urlUtils.urlSearchParamsGetBoolean(boolParams, 'disabled')).toBe(
        false,
      )
    })
  })

  describe('debug module extended tests', () => {
    const debug = require('../../registry/dist/lib/debug')

    it('should handle debug state', () => {
      const originalDebug = process.env['DEBUG']

      process.env['DEBUG'] = ''
      expect(debug.isDebug()).toBe(false)

      process.env['DEBUG'] = '*'
      expect(debug.isDebug()).toBe(true)

      process.env['DEBUG'] = 'app:*'
      expect(debug.isDebug()).toBe(true)

      process.env['DEBUG'] = originalDebug
    })

    it('should provide debuglog function', () => {
      const log = debug.debuglog('test')
      expect(typeof log).toBe('function')

      // Should not throw
      log('test message')
      log('message with %s', 'format')
    })

    it('should provide debugtime functions', () => {
      const time = debug.debugtime('test')
      expect(typeof time).toBe('function')
      expect(typeof time.start).toBe('function')
      expect(typeof time.end).toBe('function')

      time.start('operation')
      time.end('operation')
    })
  })

  describe('words module extended tests', () => {
    const words = require('../../registry/dist/lib/words')

    it('should capitalize edge cases', () => {
      expect(words.capitalize('')).toBe('')
      expect(words.capitalize('a')).toBe('A')
      expect(words.capitalize('ABC')).toBe('Abc')
      expect(words.capitalize('123abc')).toBe('123abc')
      expect(words.capitalize('hello world')).toBe('Hello world')
    })

    it('should determine articles for edge cases', () => {
      expect(words.determineArticle('')).toBe('a')
      expect(words.determineArticle('8-ball')).toBe('a')
      expect(words.determineArticle('$100')).toBe('a')
      expect(words.determineArticle('_underscore')).toBe('a')
    })

    it('should pluralize with different counts', () => {
      expect(words.pluralize('item', 0)).toBe('items')
      expect(words.pluralize('item', 1)).toBe('item')
      expect(words.pluralize('item', 2)).toBe('items')
      expect(words.pluralize('item', -1)).toBe('items')
      expect(words.pluralize('item', 1.5)).toBe('items')
    })
  })
})
