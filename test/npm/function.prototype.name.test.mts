/**
 * @fileoverview Tests for function.prototype.name NPM package override.
 * Simplified from upstream v1.1.8 (1e04422c):
 * https://github.com/es-shims/Function.prototype.name/blob/1e04422c64ec87a634955827aa346294967580c4/test/tests.js
 */

import { describe, expect, it } from 'vitest'

import { setupNpmPackageTest } from '../util/npm-package-helper.mts'

const {
  eco,
  module: getName,
  skip,
  sockRegPkgName,
} = await setupNpmPackageTest(import.meta.url)

describe(`${eco} > ${sockRegPkgName}`, { skip }, () => {
  it('named function', () => {
    expect(getName(function foo() {})).toBe('foo')
  })

  it('anonymous function', () => {
    expect(getName(function () {})).toBe('')
  })

  it('arrow function', () => {
    const arrow = () => {}
    expect(getName(arrow)).toBe('arrow')
  })

  it('Function.prototype', () => {
    const name = getName(Function.prototype)
    expect(
      name === '' || name === 'Empty' || name === 'Function.prototype',
    ).toBe(true)
  })

  it('function after accessing Function.prototype', () => {
    expect(getName(function after() {})).toBe('after')
  })
})
