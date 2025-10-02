import path from 'node:path'

import { beforeAll, describe, expect, it } from 'vitest'

import constants from '../../scripts/constants.mjs'
import { isPackageTestingSkipped } from '../../scripts/utils/tests.mjs'
import { setupMultiEntryTest } from '../utils/test-helpers.mjs'

const { NPM } = constants

const eco = NPM
const sockRegPkgName = path.basename(__filename, '.test.mts')

// is-interactive tests use xo which depends on core-assert, which uses.
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

    it('tty', () => {
      for (const isInteractive of implementations) {
        const originalCI = process.env['CI']
        delete process.env['CI']
        const stream = { isTTY: true }
        expect(isInteractive({ stream: stream as any })).toBe(true)
        if (originalCI) {
          process.env['CI'] = originalCI
        }
      }
    })

    it('non-tty', () => {
      for (const isInteractive of implementations) {
        const stream = { isTTY: false }
        expect(isInteractive({ stream: stream as any })).toBe(false)
      }
    })

    it('dumb', () => {
      for (const isInteractive of implementations) {
        const originalTerm = process.env['TERM']
        process.env['TERM'] = 'dumb'
        expect(isInteractive()).toBe(false)
        if (originalTerm) {
          process.env['TERM'] = originalTerm
        } else {
          delete process.env['TERM']
        }
      }
    })
  },
)
