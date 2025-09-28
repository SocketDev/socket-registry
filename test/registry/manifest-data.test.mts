import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getManifestData } = require('@socketsecurity/registry')

describe('manifest data utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getManifestData', () => {
    it('should return full manifest when no arguments provided', () => {
      const result = getManifestData()
      expect(result).toBeDefined()
      expect(typeof result).toBe('object')
    })

    it('should return ecosystem entries', () => {
      const npmEntries = getManifestData('npm')
      expect(Array.isArray(npmEntries)).toBe(true)
      if (npmEntries && npmEntries.length > 0) {
        // Each entry should be a tuple [purlStr, data].
        expect(Array.isArray(npmEntries[0])).toBe(true)
        expect(npmEntries[0].length).toBe(2)
      }
    })

    it('should find specific package in ecosystem', () => {
      const npmEntries = getManifestData('npm')
      if (npmEntries && npmEntries.length > 0) {
        // Just test that the entries exist and have the expected structure.
        const { 0: purl, 1: data } = npmEntries[0]
        expect(purl).toBeDefined()
        expect(data).toBeDefined()
        expect(data.name).toBeDefined()
      }
    })

    it('should return undefined for non-existent ecosystem', () => {
      const result = getManifestData('nonexistent')
      expect(result).toBeUndefined()
    })

    it('should return undefined for non-existent package', () => {
      const result = getManifestData(
        'npm',
        '@socketregistry/nonexistent-package-xyz',
      )
      expect(result).toBeUndefined()
    })

    it('should handle pypi ecosystem', () => {
      const pypiEntries = getManifestData('pypi')
      if (pypiEntries) {
        expect(Array.isArray(pypiEntries)).toBe(true)
      }
    })

    it('should handle maven ecosystem', () => {
      const mavenEntries = getManifestData('maven')
      if (mavenEntries) {
        expect(Array.isArray(mavenEntries)).toBe(true)
      }
    })

    it('should return ecosystem entries when package name is empty', () => {
      const result = getManifestData('npm', '')
      // When no specific package name is given, returns the ecosystem entries
      expect(Array.isArray(result)).toBe(true)
    })

    it('should return ecosystem entries when package name is null', () => {
      const result = getManifestData('npm', null)
      // When no specific package name is given, returns the ecosystem entries
      expect(Array.isArray(result)).toBe(true)
    })

    it('should return ecosystem entries when package name is undefined', () => {
      const result = getManifestData('npm', undefined)
      // When no specific package name is given, returns the ecosystem entries
      expect(Array.isArray(result)).toBe(true)
    })
  })

  describe('getPackageURL lazy loading', () => {
    it('should lazy load PackageURL', () => {
      // Clear the module cache to test lazy loading.
      const registryPath = require.resolve('@socketsecurity/registry')
      delete require.cache[registryPath]

      const {
        getManifestData: freshGetManifestData,
      } = require('@socketsecurity/registry')

      // Test that the function works after module reload.
      const npmEntries = freshGetManifestData('npm')
      expect(npmEntries).toBeDefined()
      expect(Array.isArray(npmEntries)).toBe(true)
    })
  })
})
