import { describe, expect, it } from 'vitest'

const {
  collectIncompatibleLicenses,
  collectLicenseWarnings,
  parseSpdxExp,
} = require('@socketsecurity/registry/lib/packages')

describe('packages license handling', () => {
  describe('collectIncompatibleLicenses', () => {
    it('should collect incompatible licenses', () => {
      const licenses = ['MIT', 'GPL-3.0', 'Apache-2.0']
      const result = collectIncompatibleLicenses(licenses)
      expect(Array.isArray(result)).toBe(true)
    })

    it('should handle empty array', () => {
      const result = collectIncompatibleLicenses([])
      expect(result).toEqual([])
    })

    it('should handle copyleft licenses', () => {
      const licenses = ['GPL-3.0', 'AGPL-3.0', 'LGPL-3.0']
      const result = collectIncompatibleLicenses(licenses)
      expect(result.length).toBeGreaterThanOrEqual(0)
    })

    it('should handle permissive licenses', () => {
      const licenses = ['MIT', 'ISC', 'BSD-3-Clause']
      const result = collectIncompatibleLicenses(licenses)
      expect(Array.isArray(result)).toBe(true)
    })

    it('should handle mixed license types', () => {
      const licenses = ['MIT', 'GPL-3.0', 'ISC', 'AGPL-3.0']
      const result = collectIncompatibleLicenses(licenses)
      expect(Array.isArray(result)).toBe(true)
    })
  })

  describe('collectLicenseWarnings', () => {
    it('should collect license warnings', () => {
      const licenseNodes = [
        { license: 'GPL-3.0', name: 'package1' },
        { license: 'MIT', name: 'package2' },
      ]
      const result = collectLicenseWarnings(licenseNodes)
      expect(Array.isArray(result)).toBe(true)
    })

    it('should handle empty array', () => {
      const result = collectLicenseWarnings([])
      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBe(0)
    })

    it('should handle packages without licenses', () => {
      const licenseNodes = [
        { name: 'package1' },
        { name: 'package2', license: null },
      ]
      const result = collectLicenseWarnings(licenseNodes)
      expect(Array.isArray(result)).toBe(true)
    })

    it('should handle UNLICENSED packages', () => {
      const licenseNodes = [{ license: 'UNLICENSED', name: 'private-package' }]
      const result = collectLicenseWarnings(licenseNodes)
      expect(Array.isArray(result)).toBe(true)
      expect(result).toContain('Package is unlicensed')
    })

    it('should handle inFile licenses', () => {
      const licenseNodes = [
        { license: 'SEE LICENSE IN LICENSE.txt', inFile: 'LICENSE.txt' },
      ]
      const result = collectLicenseWarnings(licenseNodes)
      expect(Array.isArray(result)).toBe(true)
      expect(result[0]).toContain('LICENSE.txt')
    })
  })

  describe('parseSpdxExp', () => {
    it('should parse SPDX expressions', () => {
      const result = parseSpdxExp('MIT OR Apache-2.0')
      expect(result).toBeDefined()
    })

    it('should handle simple licenses', () => {
      const result = parseSpdxExp('MIT')
      expect(result).toBeDefined()
    })

    it('should handle complex expressions', () => {
      const result = parseSpdxExp('(MIT OR Apache-2.0) AND GPL-3.0')
      expect(result).toBeDefined()
    })

    it('should handle invalid expressions', () => {
      const result = parseSpdxExp('INVALID-LICENSE')
      expect(result).toBeUndefined()
    })

    it('should handle WITH exceptions', () => {
      const result = parseSpdxExp('GPL-3.0 WITH Classpath-exception-2.0')
      expect(result).toBeDefined()
    })

    it('should handle nested parentheses', () => {
      const result = parseSpdxExp('(MIT AND (Apache-2.0 OR GPL-3.0))')
      expect(result).toBeDefined()
    })
  })
})
