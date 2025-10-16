/**
 * @fileoverview Tests for abab NPM package override.
 */

import { describe, expect, it } from 'vitest'

import { setupNpmPackageTest } from '../utils/npm-package-helper.mts'

const { eco, module: abab, skip, sockRegPkgName } =
  await setupNpmPackageTest(import.meta.url)

describe(`${eco} > ${sockRegPkgName}`, { skip }, () => {
  it('should have atob and btoa functions', () => {
    expect(typeof abab.atob).toBe('function')
    expect(typeof abab.btoa).toBe('function')
  })

  it('should encode string to base64 with btoa', () => {
    const result = abab.btoa('hello')
    expect(result).toBe('aGVsbG8=')
  })

  it('should decode base64 to string with atob', () => {
    const result = abab.atob('aGVsbG8=')
    expect(result).toBe('hello')
  })

  it('should handle empty string in btoa', () => {
    const result = abab.btoa('')
    expect(result).toBe('')
  })

  it('should handle empty string in atob', () => {
    const result = abab.atob('')
    expect(result).toBe('')
  })

  it('should round-trip btoa and atob', () => {
    const original = 'Socket Security'
    const encoded = abab.btoa(original)
    const decoded = abab.atob(encoded)
    expect(decoded).toBe(original)
  })

  it('should handle special characters', () => {
    const result = abab.btoa('hello world!')
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })
})
