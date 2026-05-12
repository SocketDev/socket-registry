/* oxlint-disable socket/prefer-cached-for-loop -- ports upstream test loops verbatim; rewriting would diverge from the source map to upstream. */
/**
 * @fileoverview Tests for path-parse NPM package override.
 * Ported 1:1 from upstream v1.0.7 (f7e258dd):
 * https://github.com/jbgutierrez/path-parse/blob/f7e258ddf7c6ec87a0236c75247fc6fd21ee7bd9/test.js
 */

import { describe, expect, it } from 'vitest'

import { setupNpmPackageTest } from '../utils/npm-package-helper.mts'

const {
  eco,
  module: pathParse,
  skip,
  sockRegPkgName,
} = await setupNpmPackageTest(import.meta.url)

const winParseTests: Array<[Record<string, string>, string]> = [
  [
    {
      root: 'C:\\',
      dir: 'C:\\path\\dir',
      base: 'index.html',
      ext: '.html',
      name: 'index',
    },
    'C:\\path\\dir\\index.html',
  ],
  [
    {
      root: 'C:\\',
      dir: 'C:\\another_path\\DIR\\1\\2\\33',
      base: 'index',
      ext: '',
      name: 'index',
    },
    'C:\\another_path\\DIR\\1\\2\\33\\index',
  ],
  [
    {
      root: '',
      dir: 'another_path\\DIR with spaces\\1\\2\\33',
      base: 'index',
      ext: '',
      name: 'index',
    },
    'another_path\\DIR with spaces\\1\\2\\33\\index',
  ],
  [{ root: '\\', dir: '\\foo', base: 'C:', ext: '', name: 'C:' }, '\\foo\\C:'],
  [{ root: '', dir: '', base: 'file', ext: '', name: 'file' }, 'file'],
  [{ root: '', dir: '.', base: 'file', ext: '', name: 'file' }, '.\\file'],
  [
    {
      root: '\\\\server\\share\\',
      dir: '\\\\server\\share\\',
      base: 'file_path',
      ext: '',
      name: 'file_path',
    },
    '\\\\server\\share\\file_path',
  ],
  [
    {
      root: '\\\\server two\\shared folder\\',
      dir: '\\\\server two\\shared folder\\',
      base: 'file path.zip',
      ext: '.zip',
      name: 'file path',
    },
    '\\\\server two\\shared folder\\file path.zip',
  ],
  [
    {
      root: '\\\\teela\\admin$\\',
      dir: '\\\\teela\\admin$\\',
      base: 'system32',
      ext: '',
      name: 'system32',
    },
    '\\\\teela\\admin$\\system32',
  ],
  [
    {
      root: '\\\\?\\UNC\\',
      dir: '\\\\?\\UNC\\server',
      base: 'share',
      ext: '',
      name: 'share',
    },
    '\\\\?\\UNC\\server\\share',
  ],
]

const unixParseTests: Array<[Record<string, string>, string]> = [
  [
    {
      root: '/',
      dir: '/home/user/dir',
      base: 'file.txt',
      ext: '.txt',
      name: 'file',
    },
    '/home/user/dir/file.txt',
  ],
  [
    {
      root: '/',
      dir: '/home/user/a dir',
      base: 'another File.zip',
      ext: '.zip',
      name: 'another File',
    },
    '/home/user/a dir/another File.zip',
  ],
  [
    {
      root: '/',
      dir: '/home/user/a dir/',
      base: 'another&File.',
      ext: '.',
      name: 'another&File',
    },
    '/home/user/a dir//another&File.',
  ],
  [
    {
      root: '/',
      dir: '/home/user/a$$$dir/',
      base: 'another File.zip',
      ext: '.zip',
      name: 'another File',
    },
    '/home/user/a$$$dir//another File.zip',
  ],
  [
    {
      root: '',
      dir: 'user/dir',
      base: 'another File.zip',
      ext: '.zip',
      name: 'another File',
    },
    'user/dir/another File.zip',
  ],
  [{ root: '', dir: '', base: 'file', ext: '', name: 'file' }, 'file'],
  [{ root: '', dir: '', base: '.\\file', ext: '', name: '.\\file' }, '.\\file'],
  [{ root: '', dir: '.', base: 'file', ext: '', name: 'file' }, './file'],
  [{ root: '', dir: '', base: 'C:\\foo', ext: '', name: 'C:\\foo' }, 'C:\\foo'],
]

const errors = [
  { input: undefined, message: /Parameter 'pathString' must be a string, not/ },
  {
    input: {},
    message: /Parameter 'pathString' must be a string, not object/,
  },
  {
    input: true,
    message: /Parameter 'pathString' must be a string, not boolean/,
  },
  {
    input: 1,
    message: /Parameter 'pathString' must be a string, not number/,
  },
  {
    input: undefined,
    message: /Parameter 'pathString' must be a string, not undefined/,
  },
]

describe(`${eco} > ${sockRegPkgName}`, { skip }, () => {
  describe('win32 parse', () => {
    for (const [expected, input] of winParseTests) {
      it(`parses ${input}`, () => {
        expect(pathParse.win32(input)).toEqual(expected)
      })
    }
  })

  describe('posix parse', () => {
    for (const [expected, input] of unixParseTests) {
      it(`parses ${input}`, () => {
        expect(pathParse.posix(input)).toEqual(expected)
      })
    }
  })

  describe('win32 errors', () => {
    for (let i = 0, { length } = errors; i < length; i += 1) {
      const errorCase = errors[i]!
      it(`throws for ${typeof errorCase.input} input`, () => {
        try {
          pathParse.win32(errorCase.input)
          expect.unreachable('should have thrown')
        } catch (err: any) {
          expect(err).toBeInstanceOf(TypeError)
          expect(err.message).toMatch(errorCase.message)
        }
      })
    }
  })

  describe('posix errors', () => {
    for (let i = 0, { length } = errors; i < length; i += 1) {
      const errorCase = errors[i]!
      it(`throws for ${typeof errorCase.input} input`, () => {
        try {
          pathParse.posix(errorCase.input)
          expect.unreachable('should have thrown')
        } catch (err: any) {
          expect(err).toBeInstanceOf(TypeError)
          expect(err.message).toMatch(errorCase.message)
        }
      })
    }
  })
})
