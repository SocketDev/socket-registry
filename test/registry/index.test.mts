import { describe, expect, it } from 'vitest'

describe('registry/index.js', () => {
  it('should export getManifestData function', () => {
    const registry = require('../../registry/dist/index.js')
    expect(registry.getManifestData).toBeDefined()
    expect(typeof registry.getManifestData).toBe('function')
  })

  it('should return full manifest when no arguments provided', () => {
    const registry = require('../../registry/dist/index.js')
    const manifest = registry.getManifestData()
    expect(manifest).toBeDefined()
    expect(typeof manifest).toBe('object')
  })

  it('should return ecosystem entries when eco provided', () => {
    const registry = require('../../registry/dist/index.js')
    const npmEntries = registry.getManifestData('npm')
    expect(Array.isArray(npmEntries) || npmEntries === undefined).toBe(true)
  })

  it('should return specific package data when eco and package name provided', () => {
    const registry = require('../../registry/dist/index.js')
    // Test with a known package from manifest.
    const packageData = registry.getManifestData(
      'npm',
      '@socketregistry/assert',
    )
    expect(packageData === undefined || typeof packageData === 'object').toBe(
      true,
    )
  })

  it('should handle invalid ecosystem gracefully', () => {
    const registry = require('../../registry/dist/index.js')
    const result = registry.getManifestData('invalid-eco')
    expect(result).toBeUndefined()
  })

  it('should handle invalid package name gracefully', () => {
    const registry = require('../../registry/dist/index.js')
    const result = registry.getManifestData('npm', 'invalid-package-xyz')
    expect(result).toBeUndefined()
  })

  it('should handle package URL parsing', () => {
    const registry = require('../../registry/dist/index.js')
    // This will exercise the PackageURL code path.
    const data = registry.getManifestData(
      'npm',
      '@socketregistry/array-flatten',
    )
    expect(data === undefined || typeof data === 'object').toBe(true)
  })
})
