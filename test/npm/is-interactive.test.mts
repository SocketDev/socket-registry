/**
 * @fileoverview Tests for is-interactive NPM package override.
 */

import { describe, expect, it } from 'vitest'

import { setupNpmPackageTest } from '../utils/npm-package-helper.mts'

const {
  eco,
  module: isInteractive,
  skip,
  sockRegPkgName,
} = await setupNpmPackageTest(import.meta.url)

describe(`${eco} > ${sockRegPkgName}`, { skip }, () => {
  it('should return a boolean', () => {
    const result = isInteractive()
    expect(typeof result).toBe('boolean')
  })

  it('should accept stream parameter', () => {
    const result = isInteractive({ stream: process.stdout })
    expect(typeof result).toBe('boolean')
  })

  it('should return false for non-TTY streams', () => {
    const nonTtyStream = {
      isTTY: false,
    }
    const result = isInteractive({ stream: nonTtyStream })
    expect(result).toBe(false)
  })
})
