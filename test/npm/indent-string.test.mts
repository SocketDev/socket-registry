/**
 * @fileoverview Tests for indent-string NPM package override.
 */

import { describe, expect, it } from 'vitest'

import { setupNpmPackageTest } from '../utils/npm-package-helper.mts'

const {
  eco,
  module: indentString,
  skip,
  sockRegPkgName,
} = await setupNpmPackageTest(import.meta.url)

describe(`${eco} > ${sockRegPkgName}`, { skip }, () => {
  it('should indent string with default 1 space', () => {
    const result = indentString('test', 1)
    expect(result).toBe(' test')
  })

  it('should indent string with multiple spaces', () => {
    const result = indentString('test', 4)
    expect(result).toBe('    test')
  })

  it('should indent multiline strings', () => {
    const result = indentString('line1\nline2\nline3', 2)
    expect(result).toBe('  line1\n  line2\n  line3')
  })

  it('should handle empty string', () => {
    const result = indentString('', 2)
    expect(result).toBe('')
  })

  it('should handle zero indent', () => {
    const result = indentString('test', 0)
    expect(result).toBe('test')
  })

  it('should allow custom indent character', () => {
    const result = indentString('test', 2, { indent: '\t' })
    expect(result).toBe('\t\ttest')
  })

  it('should handle includeEmptyLines option', () => {
    const result = indentString('line1\n\nline3', 2, {
      includeEmptyLines: true,
    })
    expect(result).toBe('  line1\n  \n  line3')
  })

  it('should not indent empty lines by default', () => {
    const result = indentString('line1\n\nline3', 2)
    expect(result).toBe('  line1\n\n  line3')
  })
})
