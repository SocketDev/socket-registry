/**
 * @fileoverview Tests for is-unicode-supported NPM package override.
 * Ported 1:1 from upstream v2.1.0 (8b80014):
 * https://github.com/sindresorhus/is-unicode-supported/blob/8b8001453e47deadb216c3b94c4b4af63477da6a/test.js
 */

import { describe, expect, it } from 'vitest'

import { setupNpmPackageTest } from '../utils/npm-package-helper.mts'

const {
  eco,
  module: isUnicodeSupported,
  skip,
  sockRegPkgName,
} = await setupNpmPackageTest(import.meta.url)

describe(`${eco} > ${sockRegPkgName}`, { skip }, () => {
  it('main', () => {
    expect(isUnicodeSupported()).toBe(true)
  })

  it('windows', () => {
    delete process.env['CI']
    delete process.env['TERM']
    delete process.env['TERM_PROGRAM']
    delete process.env['WT_SESSION']
    delete process.env['TERMINUS_SUBLIME']

    const originalPlatform = process.platform

    Object.defineProperty(process, 'platform', { value: 'win32' })
    expect(isUnicodeSupported()).toBe(false)
    process.env['WT_SESSION'] = '1'
    expect(isUnicodeSupported()).toBe(true)

    Object.defineProperty(process, 'platform', { value: originalPlatform })
  })
})
