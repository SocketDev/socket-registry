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

    it('atob correctly converts base64 strings', () => {
      for (const mod of implementations) {
        const { atob } = mod
        expect(atob('')).toBe('')
        expect(atob('abcd')).toBe(String.fromCharCode(105, 183, 29))
        expect(atob(' abcd')).toBe(String.fromCharCode(105, 183, 29))
        expect(atob('abcd ')).toBe(String.fromCharCode(105, 183, 29))
        expect(atob('ab==')).toBe(String.fromCharCode(105))
        expect(atob('abc=')).toBe(String.fromCharCode(105, 183))
      }
    })

    it('atob returns null for invalid input', () => {
      for (const mod of implementations) {
        const { atob } = mod
        expect(atob('a')).toBe(null)
        expect(atob('abcde')).toBe(null)
        expect(atob('=')).toBe(null)
        expect(atob('a=')).toBe(null)
        expect(atob('a===')).toBe(null)
        expect(atob(' abcd===')).toBe(null)
        expect(atob('abcd=== ')).toBe(null)
        expect(atob('abcd ===')).toBe(null)
      }
    })

    it('atob handles whitespace', () => {
      for (const mod of implementations) {
        const { atob } = mod
        expect(atob('ab\tcd')).toBe(String.fromCharCode(105, 183, 29))
        expect(atob('ab\ncd')).toBe(String.fromCharCode(105, 183, 29))
        expect(atob('ab\fcd')).toBe(String.fromCharCode(105, 183, 29))
        expect(atob('ab\rcd')).toBe(String.fromCharCode(105, 183, 29))
      }
    })

    it('btoa encodes strings to base64', () => {
      for (const mod of implementations) {
        const { btoa } = mod
        expect(btoa('')).toBe('')
        expect(btoa('Hello World')).toBe('SGVsbG8gV29ybGQ=')
        expect(btoa('foo')).toBe('Zm9v')
        expect(btoa('bar')).toBe('YmFy')
      }
    })

    it('btoa returns null for invalid input', () => {
      for (const mod of implementations) {
        const { btoa } = mod
        // Unicode characters outside Latin1 range.
        expect(btoa(String.fromCharCode(0xd800, 0xdc00))).toBe(null)
      }
    })

    it('atob throws TypeError when passed no inputs', () => {
      for (const mod of implementations) {
        const { atob } = mod
        expect(() => atob()).toThrow(TypeError)
      }
    })

    it('btoa throws TypeError when passed no inputs', () => {
      for (const mod of implementations) {
        const { btoa } = mod
        expect(() => btoa()).toThrow(TypeError)
      }
    })
  },
)
