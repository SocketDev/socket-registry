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

    it('returns false for non-TTY streams', () => {
      for (const isInteractive of implementations) {
        expect(isInteractive({ stream: { isTTY: false } as any })).toBe(false)
        expect(isInteractive({ stream: null as any })).toBe(false)
      }
    })

    it('returns false for dumb terminal', () => {
      for (const isInteractive of implementations) {
        const originalTerm = process.env.TERM
        process.env.TERM = 'dumb'
        expect(isInteractive({ stream: process.stdout })).toBe(false)
        if (originalTerm) {
          process.env.TERM = originalTerm
        } else {
          delete process.env.TERM
        }
      }
    })

    it('returns false when CI env is set', () => {
      for (const isInteractive of implementations) {
        const originalCI = process.env.CI
        process.env.CI = 'true'
        expect(isInteractive({ stream: { isTTY: true } as any })).toBe(false)
        if (originalCI) {
          process.env.CI = originalCI
        } else {
          delete process.env.CI
        }
      }
    })

    it('handles stream option', () => {
      for (const isInteractive of implementations) {
        const mockStream = { isTTY: true }
        // Result depends on env vars, just ensure it doesn't throw.
        expect(() => isInteractive({ stream: mockStream as any })).not.toThrow()
      }
    })

    it('uses stdout by default', () => {
      for (const isInteractive of implementations) {
        // Result depends on actual TTY status, just ensure it doesn't throw.
        expect(() => isInteractive()).not.toThrow()
      }
    })
  },
)
