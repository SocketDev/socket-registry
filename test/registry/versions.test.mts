import { describe, expect, it } from 'vitest'

import {
  coerceVersion,
  compareVersions,
  filterVersions,
  getMajorVersion,
  getMinorVersion,
  getPatchVersion,
  incrementVersion,
  isEqual,
  isGreaterThan,
  isGreaterThanOrEqual,
  isLessThan,
  isLessThanOrEqual,
  isValidVersion,
  maxVersion,
  minVersion,
  parseVersion,
  satisfiesVersion,
  sortVersions,
  sortVersionsDesc,
  versionDiff,
} from '../../registry/dist/lib/versions.js'

describe('versions module', () => {
  describe('compareVersions', () => {
    it('should return -1 when v1 < v2', () => {
      expect(compareVersions('1.0.0', '2.0.0')).toBe(-1)
    })

    it('should return 0 when v1 === v2', () => {
      expect(compareVersions('1.0.0', '1.0.0')).toBe(0)
    })

    it('should return 1 when v1 > v2', () => {
      expect(compareVersions('2.0.0', '1.0.0')).toBe(1)
    })

    it('should return undefined for invalid versions', () => {
      expect(compareVersions('invalid', '1.0.0')).toBeUndefined()
    })
  })

  describe('satisfiesVersion', () => {
    it('should return true when version satisfies range', () => {
      expect(satisfiesVersion('1.2.3', '^1.0.0')).toBe(true)
    })

    it('should return false when version does not satisfy range', () => {
      expect(satisfiesVersion('2.0.0', '^1.0.0')).toBe(false)
    })
  })

  describe('maxVersion', () => {
    it('should return the highest version', () => {
      expect(maxVersion(['1.0.0', '1.2.0', '1.1.0'])).toBe('1.2.0')
    })

    it('should return undefined for empty array', () => {
      expect(maxVersion([])).toBeUndefined()
    })
  })

  describe('minVersion', () => {
    it('should return the lowest version', () => {
      expect(minVersion(['1.0.0', '1.2.0', '1.1.0'])).toBe('1.0.0')
    })

    it('should return undefined for empty array', () => {
      expect(minVersion([])).toBeUndefined()
    })
  })

  describe('sortVersions', () => {
    it('should sort versions in ascending order', () => {
      expect(sortVersions(['1.2.0', '1.0.0', '1.1.0'])).toEqual([
        '1.0.0',
        '1.1.0',
        '1.2.0',
      ])
    })
  })

  describe('sortVersionsDesc', () => {
    it('should sort versions in descending order', () => {
      expect(sortVersionsDesc(['1.0.0', '1.2.0', '1.1.0'])).toEqual([
        '1.2.0',
        '1.1.0',
        '1.0.0',
      ])
    })
  })

  describe('isValidVersion', () => {
    it('should return true for valid versions', () => {
      expect(isValidVersion('1.0.0')).toBe(true)
    })

    it('should return false for invalid versions', () => {
      expect(isValidVersion('invalid')).toBe(false)
    })
  })

  describe('coerceVersion', () => {
    it('should coerce version strings to valid semver', () => {
      expect(coerceVersion('1.2')).toBe('1.2.0')
    })

    it('should return undefined for invalid versions', () => {
      expect(coerceVersion('invalid')).toBeUndefined()
    })
  })

  describe('parseVersion', () => {
    it('should parse version components', () => {
      const parsed = parseVersion('1.2.3-beta.1+build.123')
      expect(parsed).toEqual({
        major: 1,
        minor: 2,
        patch: 3,
        prerelease: ['beta', 1],
        build: ['build', '123'],
      })
    })

    it('should return undefined for invalid versions', () => {
      expect(parseVersion('invalid')).toBeUndefined()
    })
  })

  describe('getMajorVersion', () => {
    it('should return major version number', () => {
      expect(getMajorVersion('1.2.3')).toBe(1)
    })

    it('should return undefined for invalid versions', () => {
      expect(getMajorVersion('invalid')).toBeUndefined()
    })
  })

  describe('getMinorVersion', () => {
    it('should return minor version number', () => {
      expect(getMinorVersion('1.2.3')).toBe(2)
    })

    it('should return undefined for invalid versions', () => {
      expect(getMinorVersion('invalid')).toBeUndefined()
    })
  })

  describe('getPatchVersion', () => {
    it('should return patch version number', () => {
      expect(getPatchVersion('1.2.3')).toBe(3)
    })

    it('should return undefined for invalid versions', () => {
      expect(getPatchVersion('invalid')).toBeUndefined()
    })
  })

  describe('incrementVersion', () => {
    it('should increment major version', () => {
      expect(incrementVersion('1.2.3', 'major')).toBe('2.0.0')
    })

    it('should increment minor version', () => {
      expect(incrementVersion('1.2.3', 'minor')).toBe('1.3.0')
    })

    it('should increment patch version', () => {
      expect(incrementVersion('1.2.3', 'patch')).toBe('1.2.4')
    })

    it('should increment prerelease version', () => {
      expect(incrementVersion('1.2.3-beta.1', 'prerelease')).toBe(
        '1.2.3-beta.2',
      )
    })

    it('should return undefined for invalid versions', () => {
      expect(incrementVersion('invalid', 'major')).toBeUndefined()
    })
  })

  describe('filterVersions', () => {
    it('should filter versions by range', () => {
      expect(filterVersions(['1.0.0', '1.5.0', '2.0.0'], '^1.0.0')).toEqual([
        '1.0.0',
        '1.5.0',
      ])
    })
  })

  describe('isGreaterThan', () => {
    it('should return true when version1 > version2', () => {
      expect(isGreaterThan('2.0.0', '1.0.0')).toBe(true)
    })

    it('should return false when version1 <= version2', () => {
      expect(isGreaterThan('1.0.0', '2.0.0')).toBe(false)
    })
  })

  describe('isLessThan', () => {
    it('should return true when version1 < version2', () => {
      expect(isLessThan('1.0.0', '2.0.0')).toBe(true)
    })

    it('should return false when version1 >= version2', () => {
      expect(isLessThan('2.0.0', '1.0.0')).toBe(false)
    })
  })

  describe('isEqual', () => {
    it('should return true when versions are equal', () => {
      expect(isEqual('1.0.0', '1.0.0')).toBe(true)
    })

    it('should return false when versions are not equal', () => {
      expect(isEqual('1.0.0', '2.0.0')).toBe(false)
    })
  })

  describe('isGreaterThanOrEqual', () => {
    it('should return true when version1 >= version2', () => {
      expect(isGreaterThanOrEqual('2.0.0', '1.0.0')).toBe(true)
      expect(isGreaterThanOrEqual('1.0.0', '1.0.0')).toBe(true)
    })

    it('should return false when version1 < version2', () => {
      expect(isGreaterThanOrEqual('1.0.0', '2.0.0')).toBe(false)
    })
  })

  describe('isLessThanOrEqual', () => {
    it('should return true when version1 <= version2', () => {
      expect(isLessThanOrEqual('1.0.0', '2.0.0')).toBe(true)
      expect(isLessThanOrEqual('1.0.0', '1.0.0')).toBe(true)
    })

    it('should return false when version1 > version2', () => {
      expect(isLessThanOrEqual('2.0.0', '1.0.0')).toBe(false)
    })
  })

  describe('versionDiff', () => {
    it('should return major diff', () => {
      expect(versionDiff('1.0.0', '2.0.0')).toBe('major')
    })

    it('should return minor diff', () => {
      expect(versionDiff('1.0.0', '1.1.0')).toBe('minor')
    })

    it('should return patch diff', () => {
      expect(versionDiff('1.0.0', '1.0.1')).toBe('patch')
    })

    it('should return undefined for equal versions', () => {
      expect(versionDiff('1.0.0', '1.0.0')).toBeUndefined()
    })
  })
})
