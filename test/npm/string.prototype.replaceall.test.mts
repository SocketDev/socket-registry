/**
 * @fileoverview Tests for string.prototype.replaceall NPM package override.
 * Ported 1:1 from upstream v1.0.11 (6c1ae0c6):
 * https://github.com/es-shims/String.prototype.replaceAll/blob/6c1ae0c6/test/tests.js
 */
import { describe, expect, it } from 'vitest'

import { setupNpmPackageTest } from '../utils/npm-package-helper.mts'

const {
  eco,
  module: replaceAll,
  skip,
  sockRegPkgName,
} = await setupNpmPackageTest(import.meta.url)

describe(`${eco} > ${sockRegPkgName}`, { skip }, () => {
  it('throws with a non-global regex', () => {
    expect(() => replaceAll('abcabc', /a/, 'z')).toThrow(TypeError)
  })

  it('with a global regex matches replace with the same args', () => {
    expect(replaceAll('abcabc', /a/g, 'z')).toBe('abcabc'.replace(/a/g, 'z'))
  })

  it('with a string replaces all occurrences', () => {
    expect(replaceAll('abcabc', 'a', 'z')).toBe('zbczbc')
  })

  it('empty string replaces each code unit in single char string', () => {
    expect(replaceAll('x', '', '_')).toBe('_x_')
  })

  it('empty string replaces each code unit in multi char string', () => {
    expect(replaceAll('xxx', '', '_')).toBe('_x_x_x_')
  })

  it('empty regex replaces each code unit', () => {
    expect(replaceAll('xxx', /(?:)/g, '_')).toBe('_x_x_x_')
  })
})
