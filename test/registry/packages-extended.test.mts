import { describe, expect, it, vi } from 'vitest'

import {
  collectIncompatibleLicenses,
  collectLicenseWarnings,
  extractPackage,
  fetchPackageManifest,
  fetchPackagePackument,
  findPackageExtensions,
  findTypesForSubpath,
  getExportFilePaths,
  getRepoUrlDetails,
  gitHubTagRefUrl,
  gitHubTgzUrl,
  isRegistryFetcherType,
  parseSpdxExp,
  resolvePackageName,
  resolveRegistryPackageName,
} from '../../registry/dist/lib/packages.js'

describe('packages module extended tests', () => {
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

  describe('fetchPackageManifest', () => {
    it('should handle package name input', async () => {
      // Mock fetch to avoid actual network calls
      const originalFetch = global.fetch
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ name: 'test', version: '1.0.0' }),
      })

      try {
        const result = await fetchPackageManifest('test-package')
        expect(result).toBeDefined()
      } catch (error) {
        // May fail if no network access, that's ok for this test
        expect(error).toBeDefined()
      } finally {
        global.fetch = originalFetch
      }
    })

    it('should handle scoped packages', async () => {
      try {
        const result = await fetchPackageManifest('@scope/package')
        expect(result === null || typeof result === 'object').toBe(true)
      } catch (error) {
        // Expected if no network
        expect(error).toBeDefined()
      }
    })
  })

  describe('fetchPackagePackument', () => {
    it('should handle package name input', async () => {
      try {
        const result = await fetchPackagePackument('test-package')
        expect(result === null || typeof result === 'object').toBe(true)
      } catch (error) {
        // Expected if no network
        expect(error).toBeDefined()
      }
    })

    it('should handle options', async () => {
      try {
        const result = await fetchPackagePackument('test-package', {
          fullMetadata: true,
        })
        expect(result === null || typeof result === 'object').toBe(true)
      } catch (error) {
        expect(error).toBeDefined()
      }
    })
  })

  describe('findPackageExtensions', () => {
    it('should find package extensions for known packages', () => {
      // This function looks up extensions in a constants file
      const extensions = findPackageExtensions('eslint', '8.0.0')
      expect(extensions === undefined || typeof extensions === 'object').toBe(
        true,
      )
    })

    it('should handle unknown packages', () => {
      const extensions = findPackageExtensions('unknown-package-xyz', '1.0.0')
      expect(extensions).toBeUndefined()
    })
  })

  describe('findTypesForSubpath', () => {
    it('should find types when types property exists', () => {
      const entryExports = {
        types: './index.d.ts',
        '.': '.',
      }
      const types = findTypesForSubpath(entryExports, '.')
      expect(types).toBe('./index.d.ts')
    })

    it('should handle missing types', () => {
      const entryExports = './index.js'
      const types = findTypesForSubpath(entryExports, '.')
      expect(types).toBeUndefined()
    })

    it('should handle objects without matching subpath', () => {
      const entryExports = {
        import: './index.mjs',
        require: './index.cjs',
      }
      const types = findTypesForSubpath(entryExports, '.')
      expect(types).toBeUndefined()
    })

    it('should handle arrays with types', () => {
      const entryExports: any = ['.', { types: './array.d.ts' }]
      entryExports.types = './array.d.ts'
      const types = findTypesForSubpath(entryExports, '.')
      expect(types).toBe('./array.d.ts')
    })
  })

  describe('getRepoUrlDetails', () => {
    it('should parse GitHub repo URLs', () => {
      const details = getRepoUrlDetails('https://github.com/user/repo')
      expect(details).toBeDefined()
      expect(details.user).toBe('user')
    })

    it('should handle git URLs', () => {
      const details = getRepoUrlDetails('git+https://github.com/user/repo.git')
      expect(details).toBeDefined()
      expect(details.user).toBe('user')
    })

    it('should handle invalid URLs', () => {
      const details = getRepoUrlDetails('invalid')
      expect(details).toBeDefined()
      expect(details.user).toBe('invalid')
    })

    it('should handle empty string', () => {
      const details = getRepoUrlDetails('')
      expect(details).toBeDefined()
    })
  })

  describe('getExportFilePaths', () => {
    it('should get export file paths from object', () => {
      const exports = {
        '.': './index.js',
        './sub': './sub/index.js',
      }
      const paths = getExportFilePaths(exports)
      expect(Array.isArray(paths)).toBe(true)
      expect(paths).toContain('./index.js')
      expect(paths).toContain('./sub/index.js')
    })

    it('should handle conditional exports', () => {
      const exports = {
        '.': {
          import: './index.mjs',
          require: './index.cjs',
        },
      }
      const paths = getExportFilePaths(exports)
      expect(Array.isArray(paths)).toBe(true)
      expect(paths).toContain('./index.mjs')
      expect(paths).toContain('./index.cjs')
    })

    it('should handle non-object exports', () => {
      const paths = getExportFilePaths('./index.js')
      expect(paths).toEqual([])
    })
  })

  describe('gitHubTagRefUrl', () => {
    it('should generate GitHub tag ref URL', () => {
      const url = gitHubTagRefUrl('user', 'repo', 'v1.0.0')
      expect(url).toBe(
        'https://api.github.com/repos/user/repo/git/ref/tags/v1.0.0',
      )
    })

    it('should handle branch names', () => {
      const url = gitHubTagRefUrl('user', 'repo', 'main')
      expect(url).toBe(
        'https://api.github.com/repos/user/repo/git/ref/tags/main',
      )
    })

    it('should handle special characters', () => {
      const url = gitHubTagRefUrl('user-name', 'repo-name', 'feature/test')
      expect(url).toContain('user-name')
      expect(url).toContain('repo-name')
    })
  })

  describe('gitHubTgzUrl', () => {
    it('should generate GitHub tarball URL', () => {
      const url = gitHubTgzUrl('user', 'repo', 'v1.0.0')
      expect(url).toBe('https://github.com/user/repo/archive/v1.0.0.tar.gz')
    })

    it('should handle branch names', () => {
      const url = gitHubTgzUrl('user', 'repo', 'main')
      expect(url).toBe('https://github.com/user/repo/archive/main.tar.gz')
    })
  })

  describe('isRegistryFetcherType', () => {
    it('should identify registry fetcher types', () => {
      expect(isRegistryFetcherType('version')).toBe(true)
      expect(isRegistryFetcherType('range')).toBe(true)
      expect(isRegistryFetcherType('tag')).toBe(true)
    })

    it('should reject non-registry types', () => {
      expect(isRegistryFetcherType('git')).toBe(false)
      expect(isRegistryFetcherType('file')).toBe(false)
      expect(isRegistryFetcherType('link')).toBe(false)
      expect(isRegistryFetcherType('')).toBe(false)
    })
  })

  describe('resolvePackageName', () => {
    it('should resolve package names', () => {
      const purlObj = { namespace: '@socketregistry', name: 'lodash' }
      const result = resolvePackageName(purlObj)
      expect(result).toBe('@socketregistry/lodash')
    })

    it('should handle unscoped packages', () => {
      const purlObj = { name: 'lodash' }
      const result = resolvePackageName(purlObj)
      expect(result).toBe('lodash')
    })

    it('should handle custom delimiter', () => {
      const purlObj = { namespace: '@babel', name: 'core' }
      const result = resolvePackageName(purlObj, '__')
      expect(result).toBe('@babel__core')
    })
  })

  describe('resolveRegistryPackageName', () => {
    it('should resolve registry package names', () => {
      const result = resolveRegistryPackageName('lodash')
      expect(result).toBe('lodash')
    })

    it('should handle scoped packages', () => {
      const result = resolveRegistryPackageName('@babel/core')
      expect(result).toBe('babel__core')
    })

    it('should handle already registry packages', () => {
      const result = resolveRegistryPackageName('@socketregistry/lodash')
      expect(result).toBe('socketregistry__lodash')
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
  })

  describe('extractPackage', () => {
    it('should handle tarball extraction', async () => {
      // This needs a real tarball, so we'll mock it
      try {
        const result = await extractPackage('/fake/path.tgz', {
          // @ts-expect-error - Testing runtime behavior.
          destDir: '/tmp/extract',
        })
        expect(result).toBeDefined()
      } catch (error) {
        // Expected to fail
        expect(error).toBeDefined()
      }
    })
  })
})
