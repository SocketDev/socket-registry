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

    it('creates aggregate error from array of errors', () => {
      for (const AggregateError of implementations) {
        const errors = [new Error('error 1'), new Error('error 2')]
        const aggregateError = new AggregateError(errors)
        expect(aggregateError).toBeInstanceOf(Error)
        expect(aggregateError.errors).toEqual(errors)
      }
    })

    it('creates aggregate error with message', () => {
      for (const AggregateError of implementations) {
        const errors = [new Error('error 1')]
        const aggregateError = new AggregateError(errors, 'custom message')
        expect(aggregateError.message).toBe('custom message')
        expect(aggregateError.errors).toEqual(errors)
      }
    })

    it('formats stacked error messages', () => {
      for (const AggregateError of implementations) {
        const errors = [new Error('error 1'), new Error('error 2')]
        const aggregateError = new AggregateError(errors)
        expect(aggregateError.message).toContain('error 1')
        expect(aggregateError.message).toContain('error 2')
      }
    })

    it('handles plain objects as errors', () => {
      for (const AggregateError of implementations) {
        const errors = [{ message: 'plain error', code: 'ERR_CODE' }]
        const aggregateError = new AggregateError(errors)
        expect(aggregateError.errors[0]).toBeInstanceOf(Error)
        expect(aggregateError.errors[0].message).toBe('plain error')
        expect((aggregateError.errors[0] as any).code).toBe('ERR_CODE')
      }
    })

    it('handles non-error values', () => {
      for (const AggregateError of implementations) {
        const errors = ['string error', 42, null]
        const aggregateError = new AggregateError(errors)
        expect(aggregateError.errors).toHaveLength(3)
        for (const error of aggregateError.errors) {
          expect(error).toBeInstanceOf(Error)
        }
      }
    })

    it('Symbol.hasInstance', () => {
      for (const AggregateError of implementations) {
        const error = new AggregateError([new Error('test')])
        expect(error instanceof AggregateError).toBe(true)
        expect(error instanceof Error).toBe(true)
      }
    })
  },
)
