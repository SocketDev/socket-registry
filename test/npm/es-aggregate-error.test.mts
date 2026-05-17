/**
 * @fileoverview Tests for es-aggregate-error NPM package override.
 * Ported 1:1 from upstream v1.0.14 (9a60200e):
 * https://github.com/es-shims/AggregateError/blob/9a60200ed1a2128f48ef2d00e5a07d7c1a09c49c/test/tests.js
 */

import { describe, expect, it } from 'vitest'

import { setupNpmPackageTest } from '../util/npm-package-helper.mts'

const {
  eco,
  module: AggregateError,
  skip,
  sockRegPkgName,
} = await setupNpmPackageTest(import.meta.url)

describe(`${eco} > ${sockRegPkgName}`, { skip }, () => {
  describe('constructor', () => {
    it('is a function', () => {
      expect(typeof AggregateError).toBe('function')
    })

    it('has a length of 2', () => {
      expect(AggregateError.length).toBe(2)
    })

    it('prototype is not writable, not enumerable, not configurable', () => {
      const desc = Object.getOwnPropertyDescriptor(AggregateError, 'prototype')
      expect(desc).toEqual({
        configurable: false,
        enumerable: false,
        value: AggregateError.prototype,
        writable: false,
      })
    })
  })

  it('prototype.message is empty string', () => {
    expect(AggregateError.prototype.message).toBe('')
  })

  describe('non-iterable errors', () => {
    it.each([
      undefined,
      undefined,
      true,
      false,
      42,
      NaN,
      0,
      -0,
      Infinity,
      function () {},
      {},
    ])('throws TypeError for non-iterable %s', nonIterable => {
      expect(() => new AggregateError(nonIterable)).toThrow(TypeError)
    })
  })

  describe('instance', () => {
    it('is instanceof AggregateError and Error', () => {
      const one = new TypeError('one!')
      const two = new EvalError('two!')
      const errors = [one, two]
      const message = 'i am an aggregate error'
      const error = new AggregateError(errors, message)

      expect(error instanceof AggregateError).toBe(true)
      expect(error instanceof Error).toBe(true)
      expect(error.message).toBe(message)
      expect(error.errors).not.toBe(errors)
      expect(error.errors).toEqual(errors)
    })
  })

  describe('as a function', () => {
    it('works when called without new', () => {
      const one = new TypeError('one!')
      const two = new EvalError('two!')
      const errors = [one, two]
      const message = 'i am an aggregate error'
      const error = AggregateError(errors, message)

      expect(error instanceof AggregateError).toBe(true)
      expect(error instanceof Error).toBe(true)
      expect(error.message).toBe(message)
      expect(error.errors).not.toBe(errors)
      expect(error.errors).toEqual(errors)
    })
  })
})
