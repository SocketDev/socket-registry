import path from 'node:path'

import { beforeAll, describe, expect, it } from 'vitest'

import constants from '../../scripts/constants.mjs'
import { isPackageTestingSkipped } from '../../scripts/utils/tests.mjs'
import { setupMultiEntryTest } from '../utils/test-helpers.mjs'

const { NPM } = constants

const eco = NPM
const sockRegPkgName = path.basename(__filename, '.test.mts')

// indent-string tests use xo which depends on core-assert, which uses.
// util.isDate that was deprecated and removed in Node.js 20+.
// https://nodejs.org/docs/latest-v18.x/api/util.html#deprecated-apis
describe(
  `${eco} > ${sockRegPkgName}`,
  { skip: isPackageTestingSkipped(eco, sockRegPkgName) },
  () => {
    let implementations: any[]

    beforeAll(async () => {
      const result = await setupMultiEntryTest(sockRegPkgName, [
        'index.js',
        'index.cjs',
      ])
      implementations = result.modules
    })

    it('basic indentation', () => {
      for (const indentString of implementations) {
        expect(indentString('foo', 1)).toBe(' foo')
        expect(indentString('foo', 2)).toBe('  foo')
        expect(indentString('foo\nbar', 2)).toBe('  foo\n  bar')
      }
    })

    it('custom indent character', () => {
      for (const indentString of implementations) {
        expect(indentString('foo', 1, '\t')).toBe('\tfoo')
        expect(indentString('foo', 2, '\t')).toBe('\t\tfoo')
        expect(indentString('foo', 1, { indent: '\t' })).toBe('\tfoo')
      }
    })

    it('includeEmptyLines option', () => {
      for (const indentString of implementations) {
        expect(indentString('foo\n\nbar', 1)).toBe(' foo\n\n bar')
        expect(indentString('foo\n\nbar', 1, { includeEmptyLines: true })).toBe(
          ' foo\n \n bar',
        )
      }
    })

    it('zero count', () => {
      for (const indentString of implementations) {
        expect(indentString('foo', 0)).toBe('foo')
      }
    })

    it('error handling', () => {
      for (const indentString of implementations) {
        expect(() => indentString(null as any, 1)).toThrow(TypeError)
        expect(() => indentString('foo', -1)).toThrow(RangeError)
        expect(() => indentString('foo', '1' as any)).toThrow(TypeError)
      }
    })

    it('v2 API compatibility - indentString(input, indent, count)', () => {
      for (const indentString of implementations) {
        expect(indentString('foo', '\t', 2)).toBe('\t\tfoo')
      }
    })
  },
)
