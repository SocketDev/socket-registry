/**
 * @fileoverview Tests for is-regex NPM package override.
 */

import { describe, expect, it } from 'vitest'

import { setupNpmPackageTest } from '../utils/npm-package-helper.mts'
import {
  createInvalidValuesExcluding,
  createTypeCheckerTests,
} from '../utils/type-checker-helper.mts'

const {
  eco,
  module: isRegex,
  skip,
  sockRegPkgName,
} = await setupNpmPackageTest(import.meta.url)

describe(`${eco} > ${sockRegPkgName}`, { skip }, () => {
  createTypeCheckerTests({
    checkerFn: isRegex,
    invalidValues: createInvalidValuesExcluding(['regexp']),
    toStringTagTests: true,
    typeName: 'RegExp',
    validValues: [/a/g, /test/, /^[a-z]+$/i],
  })

  describe('RegExp edge cases', () => {
    it('should not mutate regex lastIndex', () => {
      const regex = /a/
      const marker = {}
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
})
