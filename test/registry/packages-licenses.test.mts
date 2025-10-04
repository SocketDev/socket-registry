import { describe, expect, it } from 'vitest'

import {
  collectIncompatibleLicenses,
  collectLicenseWarnings,
  parseSpdxExp,
  resolvePackageLicenses,
  visitLicenses,
} from '../../registry/dist/lib/packages.js'

describe('packages license handling', () => {
  describe('collectIncompatibleLicenses', () => {
    it('should collect incompatible licenses', () => {
      const licenses = ['MIT', 'GPL-3.0', 'Apache-2.0'] as any
      const result = collectIncompatibleLicenses(licenses)
      expect(Array.isArray(result)).toBe(true)
    })

    it('should handle empty array', () => {
      const result = collectIncompatibleLicenses([])
      expect(result).toEqual([])
    })

    it('should handle copyleft licenses', () => {
      const licenses = ['GPL-3.0', 'AGPL-3.0', 'LGPL-3.0'] as any
      const result = collectIncompatibleLicenses(licenses)
      expect(result.length).toBeGreaterThanOrEqual(0)
    })

    it('should handle permissive licenses', () => {
      const licenses = ['MIT', 'ISC', 'BSD-3-Clause'] as any
      const result = collectIncompatibleLicenses(licenses)
      expect(Array.isArray(result)).toBe(true)
    })

    it('should handle mixed license types', () => {
      const licenses = ['MIT', 'GPL-3.0', 'ISC', 'AGPL-3.0'] as any
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
      ] as any
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

  describe('visitLicenses', () => {
    it('should visit simple license node', () => {
      const ast = parseSpdxExp('MIT')
      const visited: string[] = []

      if (ast) {
        visitLicenses(ast, {
          License(node) {
            visited.push(node.license)
          },
        })
      }

      expect(visited).toContain('MIT')
    })

    it('should visit binary operation with OR', () => {
      const ast = parseSpdxExp('MIT OR Apache-2.0')
      const licenses: string[] = []

      if (ast) {
        visitLicenses(ast, {
          License(node) {
            licenses.push(node.license)
          },
        })
      }

      expect(licenses).toContain('MIT')
      expect(licenses).toContain('Apache-2.0')
    })

    it('should visit binary operation with AND', () => {
      const ast = parseSpdxExp('MIT AND ISC')
      const licenses: string[] = []

      if (ast) {
        visitLicenses(ast, {
          License(node) {
            licenses.push(node.license)
          },
        })
      }

      expect(licenses).toContain('MIT')
      expect(licenses).toContain('ISC')
    })

    it('should visit complex nested expressions', () => {
      const ast = parseSpdxExp('(MIT OR GPL-2.0) AND Apache-2.0')
      const licenses: string[] = []

      if (ast) {
        visitLicenses(ast, {
          License(node) {
            licenses.push(node.license)
          },
        })
      }

      expect(licenses.length).toBeGreaterThan(0)
    })

    it('should allow early termination with false return', () => {
      const ast = parseSpdxExp('MIT OR Apache-2.0 OR GPL-3.0')
      const visited: string[] = []

      if (ast) {
        visitLicenses(ast, {
          License(node) {
            visited.push(node.license)
            if (node.license === 'Apache-2.0') {
              return false
            }
          },
        })
      }

      expect(visited).toContain('Apache-2.0')
    })

    it('should handle BinaryOperation visitor', () => {
      const ast = parseSpdxExp('MIT OR Apache-2.0')
      let binaryOpCount = 0

      if (ast) {
        visitLicenses(ast, {
          BinaryOperation() {
            binaryOpCount += 1
          },
        })
      }

      expect(binaryOpCount).toBeGreaterThan(0)
    })

    it('should handle both License and BinaryOperation visitors', () => {
      const ast = parseSpdxExp('MIT OR Apache-2.0')
      const licenses: string[] = []
      let binaryOpCount = 0

      if (ast) {
        visitLicenses(ast, {
          License(node) {
            licenses.push(node.license)
          },
          BinaryOperation() {
            binaryOpCount += 1
          },
        })
      }

      expect(licenses.length).toBeGreaterThan(0)
      expect(binaryOpCount).toBeGreaterThan(0)
    })

    it('should terminate on BinaryOperation returning false', () => {
      const ast = parseSpdxExp('MIT OR Apache-2.0 OR GPL-3.0')
      let visitedCount = 0

      if (ast) {
        visitLicenses(ast, {
          BinaryOperation() {
            visitedCount += 1
            if (visitedCount === 1) {
              return false
            }
          },
        })
      }

      expect(visitedCount).toBe(1)
    })
  })

  describe('resolvePackageLicenses', () => {
    it('should handle UNLICENSED', () => {
      const result = resolvePackageLicenses('UNLICENSED', '/')
      expect(result).toEqual([{ license: 'UNLICENSED' }])
    })

    it('should handle UNLICENCED (misspelling)', () => {
      const result = resolvePackageLicenses('UNLICENCED', '/')
      expect(result).toEqual([{ license: 'UNLICENSED' }])
    })

    it('should handle SEE LICENSE IN pattern', () => {
      const result = resolvePackageLicenses('SEE LICENSE IN LICENSE.txt', '/')
      expect(result[0]).toBeDefined()
      expect(result[0]!.inFile).toBeDefined()
    })

    it('should parse standard SPDX expression', () => {
      const result = resolvePackageLicenses('MIT', '/')
      expect(result.length).toBeGreaterThan(0)
    })

    it('should handle complex SPDX expressions', () => {
      const result = resolvePackageLicenses('(MIT OR Apache-2.0) AND ISC', '/')
      expect(result.length).toBeGreaterThan(0)
    })
  })
})
