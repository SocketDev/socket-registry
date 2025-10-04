import { describe, expect, it } from 'vitest'

import {
  collectIncompatibleLicenses,
  collectLicenseWarnings,
  findTypesForSubpath,
  getExportFilePaths,
  getSubpaths,
  parseSpdxExp,
  resolvePackageJsonDirname,
  resolvePackageJsonEntryExports,
  resolvePackageJsonPath,
  resolvePackageLicenses,
} from '../../registry/dist/lib/packages.js'

describe('packages module - edge cases and error handling', () => {
  describe('parseSpdxExp', () => {
    it('should parse simple SPDX expressions', () => {
      const result = parseSpdxExp('MIT')
      expect(result).toBeDefined()
    })

    it('should parse compound SPDX expressions', () => {
      const result = parseSpdxExp('MIT OR Apache-2.0')
      expect(result).toBeDefined()
    })

    it('should handle AND expressions', () => {
      const result = parseSpdxExp('MIT AND ISC')
      expect(result).toBeDefined()
    })

    it('should handle invalid expressions', () => {
      const result = parseSpdxExp('invalid license string !@#')
      expect(result).toBeUndefined()
    })

    it('should handle empty string with error', () => {
      expect(() => parseSpdxExp('')).toThrow()
    })
  })

  describe('collectIncompatibleLicenses', () => {
    it('should collect incompatible licenses from license nodes', () => {
      const licenses = resolvePackageLicenses('GPL-3.0', '/')
      const result = collectIncompatibleLicenses(licenses)
      expect(Array.isArray(result)).toBe(true)
    })

    it('should handle simple license nodes', () => {
      const licenses = resolvePackageLicenses('MIT', '/')
      const result = collectIncompatibleLicenses(licenses)
      expect(Array.isArray(result)).toBe(true)
    })
  })

  describe('collectLicenseWarnings', () => {
    it('should collect warnings from license nodes', () => {
      const licenses = resolvePackageLicenses('UNLICENSED', '/')
      const warnings = collectLicenseWarnings(licenses)
      expect(Array.isArray(warnings)).toBe(true)
    })

    it('should handle empty array', () => {
      const warnings = collectLicenseWarnings([])
      expect(Array.isArray(warnings)).toBe(true)
      expect(warnings.length).toBe(0)
    })
  })

  describe('getSubpaths', () => {
    it('should extract subpaths from exports', () => {
      const exports = {
        '.': './index.js',
        './utils': './utils.js',
        './helpers': './helpers.js',
      }
      const result = getSubpaths(exports)
      expect(result).toContain('.')
      expect(result).toContain('./utils')
      expect(result).toContain('./helpers')
    })

    it('should filter out non-subpath keys', () => {
      const exports = {
        '.': './index.js',
        import: './index.mjs',
        require: './index.cjs',
      }
      const result = getSubpaths(exports)
      expect(result).toContain('.')
      expect(result).not.toContain('import')
      expect(result).not.toContain('require')
    })

    it('should handle non-object inputs', () => {
      expect(getSubpaths(null)).toEqual([])
      expect(getSubpaths(undefined)).toEqual([])
      expect(getSubpaths('string')).toEqual([])
      expect(getSubpaths(123)).toEqual([])
    })

    it('should handle empty object', () => {
      expect(getSubpaths({})).toEqual([])
    })
  })

  describe('getExportFilePaths', () => {
    it('should return empty for non-object exports', () => {
      const exports = './index.js'
      const result = getExportFilePaths(exports)
      expect(result).toEqual([])
    })

    it('should only extract paths from subpath exports', () => {
      const exports = {
        import: './index.mjs',
        require: './index.cjs',
      }
      const result = getExportFilePaths(exports)
      expect(result.length).toBe(0)
    })

    it('should extract paths from subpath exports', () => {
      const exports = {
        '.': './index.js',
        './utils': './utils.js',
      }
      const result = getExportFilePaths(exports)
      expect(result.length).toBeGreaterThan(0)
    })

    it('should handle nested conditional exports', () => {
      const exports = {
        '.': {
          import: './index.mjs',
          require: './index.cjs',
        },
      }
      const result = getExportFilePaths(exports)
      expect(result.length).toBeGreaterThan(0)
    })

    it('should handle null exports', () => {
      const result = getExportFilePaths(null)
      expect(Array.isArray(result)).toBe(true)
    })
  })

  describe('findTypesForSubpath', () => {
    it('should search for subpath in exports structure', () => {
      const exports = {
        '.': './index.js',
        types: './index.d.ts',
      }
      const result = findTypesForSubpath(exports, '.')
      expect(result).toBeUndefined()
    })

    it('should return undefined when no types found', () => {
      const exports = {
        '.': {
          import: './index.mjs',
        },
      }
      const result = findTypesForSubpath(exports, '.')
      expect(result).toBeUndefined()
    })

    it('should handle array structures', () => {
      const exports = [
        './utils',
        {
          types: './utils.d.ts',
        },
      ]
      const result = findTypesForSubpath(exports, './utils')
      // Function searches for exact value match, returns undefined
      expect(result).toBeUndefined()
    })

    it('should handle non-existent subpath', () => {
      const exports = {
        '.': './index.js',
      }
      const result = findTypesForSubpath(exports, './nonexistent')
      expect(result).toBeUndefined()
    })
  })

  describe('resolvePackageJsonDirname', () => {
    it('should resolve dirname from package.json path', () => {
      const result = resolvePackageJsonDirname('/path/to/package.json')
      expect(result).toBe('/path/to')
    })

    it('should return path unchanged if not package.json', () => {
      const result = resolvePackageJsonDirname('/path/to/directory')
      expect(result).toBe('/path/to/directory')
    })

    it('should handle root package.json', () => {
      const result = resolvePackageJsonDirname('/package.json')
      expect(result).toBe('/')
    })

    it('should handle relative paths', () => {
      const result = resolvePackageJsonDirname('./package.json')
      expect(result).toBe('.')
    })
  })

  describe('resolvePackageJsonPath', () => {
    it('should return path if it ends with package.json', () => {
      const result = resolvePackageJsonPath('/path/to/package.json')
      expect(result).toBe('/path/to/package.json')
    })

    it('should append package.json to directory path', () => {
      const result = resolvePackageJsonPath('/path/to/directory')
      expect(result).toContain('package.json')
    })

    it('should handle root directory', () => {
      const result = resolvePackageJsonPath('/')
      expect(result).toContain('package.json')
    })

    it('should handle relative paths', () => {
      const result = resolvePackageJsonPath('.')
      expect(result).toContain('package.json')
    })
  })

  describe('resolvePackageJsonEntryExports', () => {
    it('should wrap string exports in dot notation', () => {
      const result = resolvePackageJsonEntryExports('./index.js')
      expect(result).toEqual({ '.': './index.js' })
    })

    it('should resolve object exports', () => {
      const exports = {
        '.': './index.js',
      }
      const result = resolvePackageJsonEntryExports(exports)
      expect(result).toBeDefined()
    })

    it('should handle conditional exports', () => {
      const exports = {
        import: './index.mjs',
        require: './index.cjs',
      }
      const result = resolvePackageJsonEntryExports(exports)
      expect(result).toBeDefined()
    })

    it('should handle null exports', () => {
      const result = resolvePackageJsonEntryExports(null)
      expect(result).toBeUndefined()
    })

    it('should handle undefined exports', () => {
      const result = resolvePackageJsonEntryExports(undefined)
      expect(result).toBeUndefined()
    })

    it('should wrap arrays in dot notation', () => {
      const exports = ['./index.js', './fallback.js']
      const result = resolvePackageJsonEntryExports(exports)
      expect(result).toEqual({ '.': exports })
    })
  })
})
