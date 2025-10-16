/**
 * @fileoverview Tests for is-regex NPM package override.
 */

import { describe, expect, it } from 'vitest'

import { setupNpmPackageTest } from '../utils/npm-package-helper.mts'

const {
  eco,
  module: isRegex,
  skip,
  sockRegPkgName,
} = await setupNpmPackageTest(import.meta.url)

describe(`${eco} > ${sockRegPkgName}`, { skip }, () => {
  it('should return false for non-regexes', () => {
    expect(isRegex()).toBe(false)
    expect(isRegex(null)).toBe(false)
    expect(isRegex(false)).toBe(false)
    expect(isRegex(true)).toBe(false)
    expect(isRegex(42)).toBe(false)
    expect(isRegex('foo')).toBe(false)
    expect(isRegex([])).toBe(false)
    expect(isRegex({})).toBe(false)
    expect(isRegex(() => {})).toBe(false)
  })

  it('should return false for fake regex with @@toStringTag', () => {
    const regex = /a/g
    const fakeRegex = {
      toString() {
        return String(regex)
      },
      valueOf() {
        return regex
      },
      [Symbol.toStringTag]: 'RegExp',
    }

    expect(isRegex(fakeRegex)).toBe(false)
  })

  it('should return true for actual regexes', () => {
    expect(isRegex(/a/g)).toBe(true)
    expect(isRegex(/test/)).toBe(true)
    expect(isRegex(/^[a-z]+$/i)).toBe(true)
  })

  it('should not mutate regex lastIndex', () => {
    const regex = /a/
    const marker = {}
    // biome-ignore lint/suspicious/noExplicitAny: Test sets non-numeric lastIndex.
    ;(regex as any).lastIndex = marker
    expect(regex.lastIndex).toBe(marker)
    expect(isRegex(regex)).toBe(true)
    expect(regex.lastIndex).toBe(marker)
  })

  it('should handle regex with nonzero lastIndex', () => {
    const regex = /a/
    regex.lastIndex = 3
    expect(regex.lastIndex).toBe(3)
    expect(isRegex(regex)).toBe(true)
    expect(regex.lastIndex).toBe(3)
  })
})
