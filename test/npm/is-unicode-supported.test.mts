/**
 * @fileoverview Tests for is-unicode-supported NPM package override.
 * Ported 1:1 from upstream v2.1.0 (e0373335038856c63034c8eef6ac43ee3827a601):
 * https://github.com/sindresorhus/is-unicode-supported/blob/e0373335038856c63034c8eef6ac43ee3827a601/test.js
 */

import process from 'node:process'
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
    const savedCI = process.env['CI']
    const savedTERM = process.env['TERM']
    const savedTERM_PROGRAM = process.env['TERM_PROGRAM']
    const savedWT_SESSION = process.env['WT_SESSION']
    const savedTERMINUS_SUBLIME = process.env['TERMINUS_SUBLIME']
    const originalPlatform = process.platform

    try {
      delete process.env['CI']
      delete process.env['TERM']
      delete process.env['TERM_PROGRAM']
      delete process.env['WT_SESSION']
      delete process.env['TERMINUS_SUBLIME']

      Object.defineProperty(process, 'platform', { value: 'win32' })
      expect(isUnicodeSupported()).toBe(false)

      process.env['WT_SESSION'] = '1'
      expect(isUnicodeSupported()).toBe(true)
    } finally {
      Object.defineProperty(process, 'platform', {
        value: originalPlatform,
      })
      if (savedCI !== undefined) process.env['CI'] = savedCI
      else delete process.env['CI']
      if (savedTERM !== undefined) process.env['TERM'] = savedTERM
      else delete process.env['TERM']
      if (savedTERM_PROGRAM !== undefined)
        process.env['TERM_PROGRAM'] = savedTERM_PROGRAM
      else delete process.env['TERM_PROGRAM']
      if (savedWT_SESSION !== undefined)
        process.env['WT_SESSION'] = savedWT_SESSION
      else delete process.env['WT_SESSION']
      if (savedTERMINUS_SUBLIME !== undefined)
        process.env['TERMINUS_SUBLIME'] = savedTERMINUS_SUBLIME
      else delete process.env['TERMINUS_SUBLIME']
    }
  })
})
