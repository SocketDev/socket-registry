import path from 'node:path'

import { beforeAll, describe, expect, it } from 'vitest'

import constants from '../../scripts/constants.mjs'
import { isPackageTestingSkipped } from '../../scripts/utils/tests.mjs'
import { setupMultiEntryTest } from '../utils/test-helpers.mjs'

const { NPM } = constants

const eco = NPM
const sockRegPkgName = path.basename(__filename, '.test.mts')

// aggregate-error tests use xo which depends on core-assert, which uses.
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

    it('main', () => {
      for (const AggregateError of implementations) {
        const error = new AggregateError([
          new Error('foo'),
          'bar',
          {
            message: 'baz',
            code: 'EBAZ',
          },
          {
            code: 'EQUX',
          },
        ])

        expect(error.message).toMatch(/Error: foo\n {8}at /)
        expect(error.message).toMatch(/Error: bar\n {8}at /)

        expect([...error.errors]).toEqual([
          new Error('foo'),
          new Error('bar'),
          Object.assign(new Error('baz'), { code: 'EBAZ' }),
          Object.assign(new Error(), { code: 'EQUX' }),
        ])
      }
    })

    it('gracefully handle Error instances without a stack', () => {
      for (const AggregateError of implementations) {
        class StacklessError extends Error {
          constructor(...args: any[]) {
            super(...args)
            this.name = this.constructor.name
            delete (this as any).stack
          }
        }

        const error = new AggregateError([
          new Error('foo'),
          new StacklessError('stackless'),
        ])

        expect(error.message).toMatch(/Error: foo\n {8}at /)
        expect(error.message).toMatch(/StacklessError: stackless/)

        expect([...error.errors]).toEqual([
          new Error('foo'),
          new StacklessError('stackless'),
        ])
      }
    })

    it('gracefully handle Error instances with empty stack', () => {
      for (const AggregateError of implementations) {
        class EmptyStackError extends Error {
          constructor(...args: any[]) {
            super(...args)
            this.name = this.constructor.name
            this.stack = ''
          }
        }

        const error = new AggregateError([
          new Error('foo'),
          new EmptyStackError('emptystack'),
        ])

        expect(error.message).toMatch(/Error: foo\n {8}at /)
        expect(error.message).toMatch(/EmptyStackError: emptystack/)

        expect([...error.errors]).toEqual([
          new Error('foo'),
          new EmptyStackError('emptystack'),
        ])
      }
    })
  },
)
