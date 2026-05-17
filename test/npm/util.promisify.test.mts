/**
 * @fileoverview Tests for util.promisify NPM package override.
 * Ported 1:1 from upstream v1.1.3 (4e6f368e):
 * https://github.com/ljharb/util.promisify/blob/4e6f368e/test/tests.js
 */
import { describe, expect, it } from 'vitest'

import { setupNpmPackageTest } from '../util/npm-package-helper.mts'

const {
  eco,
  module: promisify,
  skip,
  sockRegPkgName,
} = await setupNpmPackageTest(import.meta.url)

describe(`${eco} > ${sockRegPkgName}`, { skip }, () => {
  it('is a function', () => {
    expect(typeof promisify).toBe('function')
  })

  it('throws on non-functions', () => {
    expect(() => promisify(undefined)).toThrow(TypeError)
  })

  it('pYes is properly promisified', async () => {
    const yes = function (...args: any[]) {
      const cb = args[args.length - 1]
      cb(undefined, args.slice(0, -1))
    }
    const pYes = promisify(yes)
    expect(typeof pYes).toBe('function')

    const result = await pYes(1, 2, 3)
    expect(result).toEqual([1, 2, 3])
  })

  it('pNo is properly promisified', async () => {
    const no = function (...args: any[]) {
      const cb = args[args.length - 1]
      cb(args.slice(0, -1))
    }
    const pNo = promisify(no)
    expect(typeof pNo).toBe('function')

    try {
      await pNo(1, 2, 3)
      expect.fail('should have rejected')
    } catch (e) {
      expect(e).toEqual([1, 2, 3])
    }
  })

  it('custom symbol', () => {
    expect(Symbol.keyFor(promisify.custom)).toBe('nodejs.util.promisify.custom')
    expect(Symbol.for('nodejs.util.promisify.custom')).toBe(promisify.custom)
  })
})
