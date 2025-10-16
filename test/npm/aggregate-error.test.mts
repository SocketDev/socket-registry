/**
 * @fileoverview Tests for aggregate-error NPM package override.
 */

import { describe, expect, it } from 'vitest'

import { setupNpmPackageTest } from '../utils/npm-package-helper.mts'

const { eco, module: AggregateError, skip, sockRegPkgName } =
  await setupNpmPackageTest(import.meta.url)

describe(`${eco} > ${sockRegPkgName}`, { skip }, () => {
  it('should create AggregateError with array of errors', () => {
    const errors = [new Error('error 1'), new Error('error 2')]
    const aggregateError = new AggregateError(errors)

    expect(aggregateError).toBeInstanceOf(Error)
    expect(aggregateError.message).toBe('')
    expect(Array.isArray(aggregateError.errors)).toBe(true)
    expect(aggregateError.errors.length).toBe(2)
  })

  it('should accept custom message', () => {
    const errors = [new Error('error 1')]
    const aggregateError = new AggregateError(errors, 'Multiple errors occurred')

    expect(aggregateError.message).toBe('Multiple errors occurred')
    expect(aggregateError.errors.length).toBe(1)
  })

  it('should handle empty errors array', () => {
    const aggregateError = new AggregateError([])

    expect(Array.isArray(aggregateError.errors)).toBe(true)
    expect(aggregateError.errors.length).toBe(0)
  })
})
