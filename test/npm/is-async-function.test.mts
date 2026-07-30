/**
 * @file Tests for is-async-function NPM package override. Ported 1:1 from
 *   upstream v2.1.1 (287a194c):
 *   https://github.com/inspect-js/is-async-function/blob/287a194ca6f5d484ae3c29819c4b0ec876fe0eca/test/index.js.
 */

import { describe, expect, it } from 'vitest'

import { setupNpmPackageTest } from '../util/npm-package-helper.mts'

const {
  eco,
  module: isAsyncFunction,
  skip,
  sockRegPkgName,
} = setupNpmPackageTest(import.meta.url)

const asyncFuncs = [
  async function () {},
  async function namedAsync() {},
  async () => {},
]

describe(`${eco} > ${sockRegPkgName}`, { skip }, () => {
  it('returns false for non-functions', () => {
    const nonFuncs = [
      true,
      false,
      null,
      undefined,
      {},
      [],
      /a/g,
      'string',
      42,
      new Date(),
    ]
    for (let i = 0, { length } = nonFuncs; i < length; i += 1) {
      expect(isAsyncFunction(nonFuncs[i])).toBe(false)
    }
  })

  it('returns false for non-async functions', () => {
    expect(isAsyncFunction(function () {})).toBe(false)
    expect(isAsyncFunction(function foo() {})).toBe(false)
  })

  it('returns false for non-async function with faked toString', () => {
    const func = function () {}
    func.toString = () => 'async function () { return "TOTALLY REAL I SWEAR!"; }'
    expect(String(func)).not.toBe(Function.prototype.toString.apply(func))
    expect(isAsyncFunction(func)).toBe(false)
  })

  it('returns false for generator functions', () => {
    const generatorFuncs = [function* () {}, function* namedGen() {}]
    for (let i = 0, { length } = generatorFuncs; i < length; i += 1) {
      expect(isAsyncFunction(generatorFuncs[i])).toBe(false)
    }
  })

  it('returns false for non-async function with faked @@toStringTag', () => {
    const asyncFunc = asyncFuncs[0]!
    const fakeAsyncFunction: {
      toString(): string
      valueOf(): unknown
      [Symbol.toStringTag]?: string
    } = {
      toString: () => String(asyncFunc),
      valueOf: () => asyncFunc,
    }
    fakeAsyncFunction[Symbol.toStringTag] = 'AsyncFunction'
    expect(isAsyncFunction(fakeAsyncFunction)).toBe(false)
  })

  it('returns true for async functions', () => {
    for (let i = 0, { length } = asyncFuncs; i < length; i += 1) {
      expect(isAsyncFunction(asyncFuncs[i])).toBe(true)
    }
  })
})
