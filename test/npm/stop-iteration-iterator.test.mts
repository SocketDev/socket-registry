/**
 * @file Tests for stop-iteration-iterator NPM package override. Ported 1:1 from
 *   upstream v1.1.0 (8bd65798):
 *   https://github.com/ljharb/stop-iteration-iterator/blob/8bd657987cf89d59ac9909a01a1a24b17e6171be/test/index.js.
 */

import { describe, expect, it } from 'vitest'

import { setupNpmPackageTest } from '../util/npm-package-helper.mts'

const {
  eco,
  module: stopIterationIterator,
  skip,
  sockRegPkgName,
} = setupNpmPackageTest(import.meta.url)

describe(`${eco} > ${sockRegPkgName}`, { skip }, () => {
  it('is a function', () => {
    expect(typeof stopIterationIterator).toBe('function')
  })

  it('throws a SyntaxError when StopIteration is not supported', () => {
    expect(() => stopIterationIterator()).toThrow(SyntaxError)
  })
})
