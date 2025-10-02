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

    it('throw if input is not a string', () => {
      for (const indentString of implementations) {
        expect(() => indentString(5 as any)).toThrow(
          'Expected `input` to be a `string`, got `number`',
        )
        expect(() => indentString(true as any)).toThrow(
          'Expected `input` to be a `string`, got `boolean`',
        )
      }
    })

    it('throw if count is not a number', () => {
      for (const indentString of implementations) {
        expect(() => indentString('foo', 'bar' as any)).toThrow(
          'Expected `count` to be a `number`, got `string`',
        )
      }
    })

    it('throw if count is a negative', () => {
      for (const indentString of implementations) {
        expect(() => indentString('foo', -1)).toThrow(
          'Expected `count` to be at least 0, got `-1`',
        )
      }
    })

    it('throw if indent is not a string', () => {
      for (const indentString of implementations) {
        expect(() => indentString('foo', 1, { indent: 1 as any })).toThrow(
          'Expected `options.indent` to be a `string`, got `number`',
        )
      }
    })

    it('indent each line in a string', () => {
      for (const indentString of implementations) {
        expect(indentString('foo\nbar')).toBe(' foo\n bar')
        expect(indentString('foo\nbar', 1)).toBe(' foo\n bar')
        expect(indentString('foo\r\nbar', 1)).toBe(' foo\r\n bar')
        expect(indentString('foo\nbar', 4)).toBe('    foo\n    bar')
      }
    })

    it('not indent whitespace only lines', () => {
      for (const indentString of implementations) {
        expect(indentString('foo\nbar\n', 1)).toBe(' foo\n bar\n')
        expect(
          indentString('foo\nbar\n', 1, { includeEmptyLines: false }),
        ).toBe(' foo\n bar\n')
        expect(
          indentString('foo\nbar\n', 1, { includeEmptyLines: null as any }),
        ).toBe(' foo\n bar\n')
      }
    })

    it('indent every line if options.includeEmptyLines is true', () => {
      for (const indentString of implementations) {
        expect(
          indentString('foo\n\nbar\n\t', 1, { includeEmptyLines: true }),
        ).toBe(' foo\n \n bar\n \t')
      }
    })

    it('indent with leading whitespace', () => {
      for (const indentString of implementations) {
        expect(indentString(' foo\n bar\n', 1)).toBe('  foo\n  bar\n')
      }
    })

    it('indent with custom string', () => {
      for (const indentString of implementations) {
        expect(indentString('foo\nbar\n', 1, { indent: '♥' })).toBe(
          '♥foo\n♥bar\n',
        )
      }
    })

    it('not indent when count is 0', () => {
      for (const indentString of implementations) {
        expect(indentString('foo\nbar\n', 0)).toBe('foo\nbar\n')
      }
    })
  },
)
