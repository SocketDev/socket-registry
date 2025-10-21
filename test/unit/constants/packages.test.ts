/**
 * @fileoverview Tests for package-related constants and getters.
 *
 * Validates package metadata and default values.
 */

import {
  AT_LATEST,
  getLifecycleScriptNames,
  getNpmLifecycleEvent,
  getPackageDefaultNodeRange,
  getPackageDefaultSocketCategories,
  getPackageExtensions,
  getPackumentCache,
  getPacoteCachePath,
  LATEST,
  PACKAGE,
  PACKAGE_DEFAULT_VERSION,
} from '@socketsecurity/lib/constants/packages'
import { describe, expect, it } from 'vitest'

describe('packages constants', () => {
  describe('package constants', () => {
    it('should have basic package constants', () => {
      expect(PACKAGE).toBe('package')
      expect(AT_LATEST).toBe('@latest')
      expect(LATEST).toBe('latest')
      expect(PACKAGE_DEFAULT_VERSION).toBe('1.0.0')
    })
  })

  describe('package getters', () => {
    it('should have getPackageDefaultNodeRange function', () => {
      expect(typeof getPackageDefaultNodeRange).toBe('function')
      const result = getPackageDefaultNodeRange()
      expect(typeof result).toBe('string')
    })

    it('should have getPackageDefaultSocketCategories function', () => {
      expect(typeof getPackageDefaultSocketCategories).toBe('function')
      const result = getPackageDefaultSocketCategories()
      expect(Array.isArray(result) || result === undefined).toBe(true)
    })

    it('should have getPackageExtensions function', () => {
      expect(typeof getPackageExtensions).toBe('function')
      const result = getPackageExtensions()
      expect(typeof result[Symbol.iterator]).toBe('function')
    })

    it('should have getNpmLifecycleEvent function', () => {
      expect(typeof getNpmLifecycleEvent).toBe('function')
      const result = getNpmLifecycleEvent()
      expect(result === undefined || typeof result === 'string').toBe(true)
    })

    it('should have getLifecycleScriptNames function', () => {
      expect(typeof getLifecycleScriptNames).toBe('function')
      const result = getLifecycleScriptNames()
      expect(Array.isArray(result)).toBe(true)
    })

    it('should have getPackumentCache function', () => {
      expect(typeof getPackumentCache).toBe('function')
      const result = getPackumentCache()
      expect(result instanceof Map).toBe(true)
    })

    it('should have getPacoteCachePath function', () => {
      expect(typeof getPacoteCachePath).toBe('function')
      const result = getPacoteCachePath()
      expect(typeof result).toBe('string')
    })
  })

  describe('caching behavior', () => {
    it('should return same Map instance on multiple calls', () => {
      const cache1 = getPackumentCache()
      const cache2 = getPackumentCache()
      expect(cache1).toBe(cache2)
    })
  })
})
