import path from 'node:path'

import { beforeAll, describe, expect, it } from 'vitest'

import constants from '../../scripts/constants.mjs'
import { isPackageTestingSkipped } from '../../scripts/utils/tests.mjs'
import { setupMultiEntryTest } from '../utils/test-helpers.mjs'

const { NPM } = constants

const eco = NPM
const sockRegPkgName = path.basename(__filename, '.test.mts')

// abab tests use old assert package that depends on util.isError which was.
// deprecated and removed in Node.js 20+.
// https://nodejs.org/docs/latest-v18.x/api/util.html#deprecated-apis
describe(
  `${eco} > ${sockRegPkgName}`,
  { skip: isPackageTestingSkipped(eco, sockRegPkgName) },
  () => {
    let implementations: any[]

    beforeAll(async () => {
      const result = await setupMultiEntryTest(sockRegPkgName, ['index.js'])
      implementations = result.modules
    })

    it('atob decodes base64 strings', () => {
      for (const mod of implementations) {
        const { atob } = mod
        expect(atob('SGVsbG8gV29ybGQ=')).toBe('Hello World')
        expect(atob('Zm9v')).toBe('foo')
        expect(atob('YmFy')).toBe('bar')
      }
    })

    it('btoa encodes strings to base64', () => {
      for (const mod of implementations) {
        const { btoa } = mod
        expect(btoa('Hello World')).toBe('SGVsbG8gV29ybGQ=')
        expect(btoa('foo')).toBe('Zm9v')
        expect(btoa('bar')).toBe('YmFy')
      }
    })

    it('atob returns null for invalid input', () => {
      for (const mod of implementations) {
        const { atob } = mod
        expect(atob('not valid base64!')).toBe(null)
      }
    })

    it('btoa returns null for invalid input', () => {
      for (const mod of implementations) {
        const { btoa } = mod
        // Unicode characters outside Latin1 range.
        expect(btoa('\u{1F600}')).toBe(null)
      }
    })

    it('atob and btoa are inverse operations', () => {
      for (const mod of implementations) {
        const { atob, btoa } = mod
        const testStrings = ['test', 'Hello World', '123456']
        for (const str of testStrings) {
          expect(atob(btoa(str))).toBe(str)
        }
      }
    })

    it('handles empty strings', () => {
      for (const mod of implementations) {
        const { atob, btoa } = mod
        expect(btoa('')).toBe('')
        expect(atob('')).toBe('')
      }
    })
  },
)
