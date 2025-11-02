/**
 * @fileoverview Tests for @socketsecurity/registry package.
 */

import { describe, expect, it } from 'vitest'

import * as registry from '../registry/src/index.js'

const SOCKET_REGISTRY_PACKAGE_NAME = '@socketsecurity/registry'

describe(SOCKET_REGISTRY_PACKAGE_NAME, () => {
  it('should export main registry functions', () => {
    expect(registry).toBeDefined()
    expect(typeof registry).toBe('object')
    expect(typeof registry.getManifestData).toBe('function')
  })

  describe('getManifestData', () => {
    it('should return full manifest when called with no arguments', () => {
      const manifest = registry.getManifestData()
      expect(manifest).toBeDefined()
      expect(typeof manifest).toBe('object')
      expect(manifest).not.toBeNull()
    })

    it('should return ecosystem data when called with ecosystem', () => {
      const npmData = registry.getManifestData('npm')
      expect(npmData).toBeDefined()
      expect(Array.isArray(npmData)).toBe(true)
    })

    it('should return undefined for non-existent ecosystem', () => {
      const result = registry.getManifestData('nonexistent')
      expect(result).toBeUndefined()
    })

    it('should return package data when called with ecosystem and package name', () => {
      const data = registry.getManifestData('npm', 'is-string')
      expect(data).toBeDefined()
      expect(typeof data).toBe('object')
      expect(data).toHaveProperty('package', 'is-string')
    })

    it('should return undefined for non-existent package', () => {
      const result = registry.getManifestData('npm', 'nonexistent-package')
      expect(result).toBeUndefined()
    })

    it('should return undefined when ecosystem exists but package does not', () => {
      const result = registry.getManifestData(
        'npm',
        'definitely-does-not-exist-123',
      )
      expect(result).toBeUndefined()
    })
  })

  it('should have working utility functions', async () => {
    const { isObjectObject } = await import('@socketsecurity/lib/objects')
    expect(typeof isObjectObject).toBe('function')
    expect(isObjectObject({})).toBe(true)
    expect(isObjectObject(null)).toBe(false)
    expect(isObjectObject([])).toBe(false)
  })
})
