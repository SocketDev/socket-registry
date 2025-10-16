/**
 * @fileoverview Tests for version comparison and validation utilities.
 *
 * Validates semantic versioning functions including parsing, comparing, filtering, and incrementing.
 */
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
} from '../../../registry/dist/lib/versions.js'

describe('versions utilities', () => {
  describe('coerceVersion', () => {
    it('should coerce valid version string', () => {
      const result = coerceVersion('1.2.3')
      expect(result).toBe('1.2.3')
    })

    it('should coerce version with prefix', () => {
      const result = coerceVersion('v1.2.3')
      expect(result).toBe('1.2.3')
    })

    it('should coerce version with extra parts', () => {
      const result = coerceVersion('1.2.3.4')
      expect(result).toBe('1.2.3')
    })

    it('should coerce version from partial', () => {
      const result = coerceVersion('1.2')
      expect(result).toBe('1.2.0')
    })

    it('should coerce version from single number', () => {
      const result = coerceVersion('1')
      expect(result).toBe('1.0.0')
    })

    it('should return undefined for invalid version', () => {
      const result = coerceVersion('invalid')
      expect(result).toBeUndefined()
    })

    it('should return undefined for empty string', () => {
      const result = coerceVersion('')
      expect(result).toBeUndefined()
    })

    it('should coerce version with prerelease', () => {
      const result = coerceVersion('1.2.3-alpha')
      expect(result).toBe('1.2.3')
    })

    it('should coerce version with build metadata', () => {
      const result = coerceVersion('1.2.3+build')
      expect(result).toBe('1.2.3')
    })

    it('should coerce version from text with numbers', () => {
      const result = coerceVersion('version 1.2.3')
      expect(result).toBe('1.2.3')
    })
  })

  describe('compareVersions', () => {
    it('should return -1 when v1 is less than v2', () => {
      const result = compareVersions('1.0.0', '2.0.0')
      expect(result).toBe(-1)
    })

    it('should return 0 when versions are equal', () => {
      const result = compareVersions('1.2.3', '1.2.3')
      expect(result).toBe(0)
    })

    it('should return 1 when v1 is greater than v2', () => {
      const result = compareVersions('2.0.0', '1.0.0')
      expect(result).toBe(1)
    })

    it('should compare minor versions', () => {
      const result = compareVersions('1.2.0', '1.1.0')
      expect(result).toBe(1)
    })

    it('should compare patch versions', () => {
      const result = compareVersions('1.0.1', '1.0.2')
      expect(result).toBe(-1)
    })

    it('should return undefined for invalid v1', () => {
      const result = compareVersions('invalid', '1.0.0')
      expect(result).toBeUndefined()
    })

    it('should return undefined for invalid v2', () => {
      const result = compareVersions('1.0.0', 'invalid')
      expect(result).toBeUndefined()
    })

    it('should return undefined for both invalid', () => {
      const result = compareVersions('invalid', 'invalid')
      expect(result).toBeUndefined()
    })

    it('should compare prerelease versions', () => {
      const result = compareVersions('1.0.0-alpha', '1.0.0-beta')
      expect(result).toBe(-1)
    })

    it('should compare version with prerelease to release', () => {
      const result = compareVersions('1.0.0-alpha', '1.0.0')
      expect(result).toBe(-1)
    })
  })

  describe('filterVersions', () => {
    const versions = ['1.0.0', '1.5.0', '2.0.0', '2.5.0', '3.0.0']

    it('should filter versions by exact match', () => {
      const result = filterVersions(versions, '2.0.0')
      expect(result).toEqual(['2.0.0'])
    })

    it('should filter versions by range', () => {
      const result = filterVersions(versions, '>=2.0.0')
      expect(result).toEqual(['2.0.0', '2.5.0', '3.0.0'])
    })

    it('should filter versions by caret range', () => {
      const result = filterVersions(versions, '^2.0.0')
      expect(result).toEqual(['2.0.0', '2.5.0'])
    })

    it('should filter versions by tilde range', () => {
      const result = filterVersions(versions, '~1.5.0')
      expect(result).toEqual(['1.5.0'])
    })

    it('should filter with less than', () => {
      const result = filterVersions(versions, '<2.0.0')
      expect(result).toEqual(['1.0.0', '1.5.0'])
    })

    it('should filter with wildcard', () => {
      const result = filterVersions(versions, '2.x')
      expect(result).toEqual(['2.0.0', '2.5.0'])
    })

    it('should return empty array when no matches', () => {
      const result = filterVersions(versions, '4.x')
      expect(result).toEqual([])
    })

    it('should handle empty versions array', () => {
      const result = filterVersions([], '>=1.0.0')
      expect(result).toEqual([])
    })

    it('should filter with multiple conditions', () => {
      const result = filterVersions(versions, '>=1.5.0 <3.0.0')
      expect(result).toEqual(['1.5.0', '2.0.0', '2.5.0'])
    })
  })

  describe('getMajorVersion', () => {
    it('should get major version from valid version', () => {
      const result = getMajorVersion('1.2.3')
      expect(result).toBe(1)
    })

    it('should get major version from version with large numbers', () => {
      const result = getMajorVersion('10.20.30')
      expect(result).toBe(10)
    })

    it('should return undefined for invalid version', () => {
      const result = getMajorVersion('invalid')
      expect(result).toBeUndefined()
    })

    it('should get major version from prerelease', () => {
      const result = getMajorVersion('2.0.0-alpha')
      expect(result).toBe(2)
    })

    it('should handle version zero', () => {
      const result = getMajorVersion('0.1.2')
      expect(result).toBe(0)
    })
  })

  describe('getMinorVersion', () => {
    it('should get minor version from valid version', () => {
      const result = getMinorVersion('1.2.3')
      expect(result).toBe(2)
    })

    it('should get minor version from version with large numbers', () => {
      const result = getMinorVersion('10.20.30')
      expect(result).toBe(20)
    })

    it('should return undefined for invalid version', () => {
      const result = getMinorVersion('invalid')
      expect(result).toBeUndefined()
    })

    it('should get minor version from prerelease', () => {
      const result = getMinorVersion('1.5.0-beta')
      expect(result).toBe(5)
    })

    it('should handle version zero', () => {
      const result = getMinorVersion('1.0.3')
      expect(result).toBe(0)
    })
  })

  describe('getPatchVersion', () => {
    it('should get patch version from valid version', () => {
      const result = getPatchVersion('1.2.3')
      expect(result).toBe(3)
    })

    it('should get patch version from version with large numbers', () => {
      const result = getPatchVersion('10.20.30')
      expect(result).toBe(30)
    })

    it('should return undefined for invalid version', () => {
      const result = getPatchVersion('invalid')
      expect(result).toBeUndefined()
    })

    it('should get patch version from prerelease', () => {
      const result = getPatchVersion('1.2.4-rc1')
      expect(result).toBe(4)
    })

    it('should handle version zero', () => {
      const result = getPatchVersion('1.2.0')
      expect(result).toBe(0)
    })
  })

  describe('incrementVersion', () => {
    it('should increment major version', () => {
      const result = incrementVersion('1.2.3', 'major')
      expect(result).toBe('2.0.0')
    })

    it('should increment minor version', () => {
      const result = incrementVersion('1.2.3', 'minor')
      expect(result).toBe('1.3.0')
    })

    it('should increment patch version', () => {
      const result = incrementVersion('1.2.3', 'patch')
      expect(result).toBe('1.2.4')
    })

    it('should increment premajor version', () => {
      const result = incrementVersion('1.2.3', 'premajor', 'alpha')
      expect(result).toBe('2.0.0-alpha.0')
    })

    it('should increment preminor version', () => {
      const result = incrementVersion('1.2.3', 'preminor', 'beta')
      expect(result).toBe('1.3.0-beta.0')
    })

    it('should increment prepatch version', () => {
      const result = incrementVersion('1.2.3', 'prepatch', 'rc')
      expect(result).toBe('1.2.4-rc.0')
    })

    it('should increment prerelease version', () => {
      const result = incrementVersion('1.2.3-alpha.0', 'prerelease')
      expect(result).toBe('1.2.3-alpha.1')
    })

    it('should return undefined for invalid version', () => {
      const result = incrementVersion('invalid', 'major')
      expect(result).toBeUndefined()
    })

    it('should increment prerelease without identifier', () => {
      const result = incrementVersion('1.0.0-0', 'prerelease')
      expect(result).toBe('1.0.0-1')
    })
  })

  describe('isEqual', () => {
    it('should return true for equal versions', () => {
      const result = isEqual('1.2.3', '1.2.3')
      expect(result).toBe(true)
    })

    it('should return false for different versions', () => {
      const result = isEqual('1.2.3', '1.2.4')
      expect(result).toBe(false)
    })

    it('should return false for different major versions', () => {
      const result = isEqual('1.0.0', '2.0.0')
      expect(result).toBe(false)
    })

    it('should handle prerelease versions', () => {
      const result = isEqual('1.0.0-alpha', '1.0.0-alpha')
      expect(result).toBe(true)
    })

    it('should handle build metadata', () => {
      const result = isEqual('1.0.0+build1', '1.0.0+build2')
      expect(result).toBe(true)
    })
  })

  describe('isGreaterThan', () => {
    it('should return true when v1 is greater than v2', () => {
      const result = isGreaterThan('2.0.0', '1.0.0')
      expect(result).toBe(true)
    })

    it('should return false when v1 equals v2', () => {
      const result = isGreaterThan('1.0.0', '1.0.0')
      expect(result).toBe(false)
    })

    it('should return false when v1 is less than v2', () => {
      const result = isGreaterThan('1.0.0', '2.0.0')
      expect(result).toBe(false)
    })

    it('should handle minor versions', () => {
      const result = isGreaterThan('1.2.0', '1.1.0')
      expect(result).toBe(true)
    })

    it('should handle patch versions', () => {
      const result = isGreaterThan('1.0.2', '1.0.1')
      expect(result).toBe(true)
    })

    it('should handle prerelease versions', () => {
      const result = isGreaterThan('1.0.0', '1.0.0-alpha')
      expect(result).toBe(true)
    })
  })

  describe('isGreaterThanOrEqual', () => {
    it('should return true when v1 is greater than v2', () => {
      const result = isGreaterThanOrEqual('2.0.0', '1.0.0')
      expect(result).toBe(true)
    })

    it('should return true when v1 equals v2', () => {
      const result = isGreaterThanOrEqual('1.0.0', '1.0.0')
      expect(result).toBe(true)
    })

    it('should return false when v1 is less than v2', () => {
      const result = isGreaterThanOrEqual('1.0.0', '2.0.0')
      expect(result).toBe(false)
    })

    it('should handle minor versions', () => {
      const result = isGreaterThanOrEqual('1.2.0', '1.2.0')
      expect(result).toBe(true)
    })

    it('should handle patch versions', () => {
      const result = isGreaterThanOrEqual('1.0.1', '1.0.1')
      expect(result).toBe(true)
    })
  })

  describe('isLessThan', () => {
    it('should return true when v1 is less than v2', () => {
      const result = isLessThan('1.0.0', '2.0.0')
      expect(result).toBe(true)
    })

    it('should return false when v1 equals v2', () => {
      const result = isLessThan('1.0.0', '1.0.0')
      expect(result).toBe(false)
    })

    it('should return false when v1 is greater than v2', () => {
      const result = isLessThan('2.0.0', '1.0.0')
      expect(result).toBe(false)
    })

    it('should handle minor versions', () => {
      const result = isLessThan('1.1.0', '1.2.0')
      expect(result).toBe(true)
    })

    it('should handle patch versions', () => {
      const result = isLessThan('1.0.1', '1.0.2')
      expect(result).toBe(true)
    })

    it('should handle prerelease versions', () => {
      const result = isLessThan('1.0.0-alpha', '1.0.0')
      expect(result).toBe(true)
    })
  })

  describe('isLessThanOrEqual', () => {
    it('should return true when v1 is less than v2', () => {
      const result = isLessThanOrEqual('1.0.0', '2.0.0')
      expect(result).toBe(true)
    })

    it('should return true when v1 equals v2', () => {
      const result = isLessThanOrEqual('1.0.0', '1.0.0')
      expect(result).toBe(true)
    })

    it('should return false when v1 is greater than v2', () => {
      const result = isLessThanOrEqual('2.0.0', '1.0.0')
      expect(result).toBe(false)
    })

    it('should handle minor versions', () => {
      const result = isLessThanOrEqual('1.2.0', '1.2.0')
      expect(result).toBe(true)
    })

    it('should handle patch versions', () => {
      const result = isLessThanOrEqual('1.0.1', '1.0.1')
      expect(result).toBe(true)
    })
  })

  describe('isValidVersion', () => {
    it('should return true for valid semver', () => {
      const result = isValidVersion('1.2.3')
      expect(result).toBe(true)
    })

    it('should return true for version with prerelease', () => {
      const result = isValidVersion('1.2.3-alpha')
      expect(result).toBe(true)
    })

    it('should return true for version with build metadata', () => {
      const result = isValidVersion('1.2.3+build')
      expect(result).toBe(true)
    })

    it('should return true for version zero', () => {
      const result = isValidVersion('0.0.0')
      expect(result).toBe(true)
    })

    it('should return false for invalid version', () => {
      const result = isValidVersion('invalid')
      expect(result).toBe(false)
    })

    it('should return false for partial version', () => {
      const result = isValidVersion('1.2')
      expect(result).toBe(false)
    })

    it('should return false for empty string', () => {
      const result = isValidVersion('')
      expect(result).toBe(false)
    })

    it('should return true for version with prefix', () => {
      const result = isValidVersion('v1.2.3')
      expect(result).toBe(true)
    })

    it('should return true for complex prerelease', () => {
      const result = isValidVersion('1.0.0-alpha.1.2.3')
      expect(result).toBe(true)
    })
  })

  describe('maxVersion', () => {
    it('should return highest version from array', () => {
      const versions = ['1.0.0', '2.0.0', '1.5.0']
      const result = maxVersion(versions)
      expect(result).toBe('2.0.0')
    })

    it('should handle single version', () => {
      const result = maxVersion(['1.0.0'])
      expect(result).toBe('1.0.0')
    })

    it('should return undefined for empty array', () => {
      const result = maxVersion([])
      expect(result).toBeUndefined()
    })

    it('should handle versions with prerelease', () => {
      const versions = ['1.0.0-alpha', '1.0.0', '1.0.0-beta']
      const result = maxVersion(versions)
      expect(result).toBe('1.0.0')
    })

    it('should handle large version numbers', () => {
      const versions = ['10.0.0', '100.0.0', '50.0.0']
      const result = maxVersion(versions)
      expect(result).toBe('100.0.0')
    })

    it('should handle patch versions', () => {
      const versions = ['1.0.1', '1.0.10', '1.0.2']
      const result = maxVersion(versions)
      expect(result).toBe('1.0.10')
    })
  })

  describe('minVersion', () => {
    it('should return lowest version from array', () => {
      const versions = ['1.0.0', '2.0.0', '1.5.0']
      const result = minVersion(versions)
      expect(result).toBe('1.0.0')
    })

    it('should handle single version', () => {
      const result = minVersion(['1.0.0'])
      expect(result).toBe('1.0.0')
    })

    it('should return undefined for empty array', () => {
      const result = minVersion([])
      expect(result).toBeUndefined()
    })

    it('should handle versions with prerelease', () => {
      const versions = ['1.0.0-alpha', '1.0.0', '1.0.0-beta']
      const result = minVersion(versions)
      expect(result).toBe('1.0.0')
    })

    it('should handle large version numbers', () => {
      const versions = ['10.0.0', '100.0.0', '1.0.0']
      const result = minVersion(versions)
      expect(result).toBe('1.0.0')
    })

    it('should handle patch versions', () => {
      const versions = ['1.0.1', '1.0.10', '1.0.2']
      const result = minVersion(versions)
      expect(result).toBe('1.0.1')
    })
  })

  describe('parseVersion', () => {
    it('should parse valid version', () => {
      const result = parseVersion('1.2.3')
      expect(result).toEqual({
        major: 1,
        minor: 2,
        patch: 3,
        prerelease: [],
        build: [],
      })
    })

    it('should parse version with prerelease', () => {
      const result = parseVersion('1.2.3-alpha.1')
      expect(result?.major).toBe(1)
      expect(result?.minor).toBe(2)
      expect(result?.patch).toBe(3)
      expect(result?.prerelease).toEqual(['alpha', 1])
    })

    it('should parse version with build metadata', () => {
      const result = parseVersion('1.2.3+build.123')
      expect(result?.major).toBe(1)
      expect(result?.minor).toBe(2)
      expect(result?.patch).toBe(3)
      expect(result?.build).toEqual(['build', '123'])
    })

    it('should return undefined for invalid version', () => {
      const result = parseVersion('invalid')
      expect(result).toBeUndefined()
    })

    it('should return undefined for empty string', () => {
      const result = parseVersion('')
      expect(result).toBeUndefined()
    })

    it('should parse version zero', () => {
      const result = parseVersion('0.0.0')
      expect(result).toEqual({
        major: 0,
        minor: 0,
        patch: 0,
        prerelease: [],
        build: [],
      })
    })

    it('should parse complex prerelease', () => {
      const result = parseVersion('1.0.0-rc.1.2.3')
      expect(result?.prerelease).toEqual(['rc', 1, 2, 3])
    })

    it('should parse with both prerelease and build', () => {
      const result = parseVersion('1.0.0-beta.1+build.456')
      expect(result?.prerelease).toEqual(['beta', 1])
      expect(result?.build).toEqual(['build', '456'])
    })
  })

  describe('satisfiesVersion', () => {
    it('should return true for exact match', () => {
      const result = satisfiesVersion('1.2.3', '1.2.3')
      expect(result).toBe(true)
    })

    it('should return true for range match', () => {
      const result = satisfiesVersion('1.5.0', '>=1.0.0')
      expect(result).toBe(true)
    })

    it('should return false when not in range', () => {
      const result = satisfiesVersion('1.5.0', '>=2.0.0')
      expect(result).toBe(false)
    })

    it('should handle caret range', () => {
      const result = satisfiesVersion('1.2.3', '^1.0.0')
      expect(result).toBe(true)
    })

    it('should handle tilde range', () => {
      const result = satisfiesVersion('1.2.3', '~1.2.0')
      expect(result).toBe(true)
    })

    it('should handle wildcard', () => {
      const result = satisfiesVersion('1.5.0', '1.x')
      expect(result).toBe(true)
    })

    it('should handle complex range', () => {
      const result = satisfiesVersion('1.5.0', '>=1.0.0 <2.0.0')
      expect(result).toBe(true)
    })

    it('should handle prerelease versions', () => {
      const result = satisfiesVersion('1.0.0-alpha', '1.0.0-alpha')
      expect(result).toBe(true)
    })
  })

  describe('sortVersions', () => {
    it('should sort versions in ascending order', () => {
      const versions = ['2.0.0', '1.0.0', '1.5.0']
      const result = sortVersions(versions)
      expect(result).toEqual(['1.0.0', '1.5.0', '2.0.0'])
    })

    it('should handle single version', () => {
      const result = sortVersions(['1.0.0'])
      expect(result).toEqual(['1.0.0'])
    })

    it('should handle empty array', () => {
      const result = sortVersions([])
      expect(result).toEqual([])
    })

    it('should not mutate original array', () => {
      const versions = ['2.0.0', '1.0.0']
      const result = sortVersions(versions)
      expect(versions).toEqual(['2.0.0', '1.0.0'])
      expect(result).toEqual(['1.0.0', '2.0.0'])
    })

    it('should handle prerelease versions', () => {
      const versions = ['1.0.0', '1.0.0-beta', '1.0.0-alpha']
      const result = sortVersions(versions)
      expect(result[0]).toBe('1.0.0-alpha')
      expect(result[2]).toBe('1.0.0')
    })

    it('should handle patch versions', () => {
      const versions = ['1.0.10', '1.0.2', '1.0.1']
      const result = sortVersions(versions)
      expect(result).toEqual(['1.0.1', '1.0.2', '1.0.10'])
    })

    it('should handle large version numbers', () => {
      const versions = ['100.0.0', '10.0.0', '1.0.0']
      const result = sortVersions(versions)
      expect(result).toEqual(['1.0.0', '10.0.0', '100.0.0'])
    })
  })

  describe('sortVersionsDesc', () => {
    it('should sort versions in descending order', () => {
      const versions = ['1.0.0', '2.0.0', '1.5.0']
      const result = sortVersionsDesc(versions)
      expect(result).toEqual(['2.0.0', '1.5.0', '1.0.0'])
    })

    it('should handle single version', () => {
      const result = sortVersionsDesc(['1.0.0'])
      expect(result).toEqual(['1.0.0'])
    })

    it('should handle empty array', () => {
      const result = sortVersionsDesc([])
      expect(result).toEqual([])
    })

    it('should not mutate original array', () => {
      const versions = ['1.0.0', '2.0.0']
      const result = sortVersionsDesc(versions)
      expect(versions).toEqual(['1.0.0', '2.0.0'])
      expect(result).toEqual(['2.0.0', '1.0.0'])
    })

    it('should handle prerelease versions', () => {
      const versions = ['1.0.0-alpha', '1.0.0-beta', '1.0.0']
      const result = sortVersionsDesc(versions)
      expect(result[0]).toBe('1.0.0')
      expect(result[2]).toBe('1.0.0-alpha')
    })

    it('should handle patch versions', () => {
      const versions = ['1.0.1', '1.0.2', '1.0.10']
      const result = sortVersionsDesc(versions)
      expect(result).toEqual(['1.0.10', '1.0.2', '1.0.1'])
    })

    it('should handle large version numbers', () => {
      const versions = ['1.0.0', '10.0.0', '100.0.0']
      const result = sortVersionsDesc(versions)
      expect(result).toEqual(['100.0.0', '10.0.0', '1.0.0'])
    })
  })

  describe('versionDiff', () => {
    it('should return major for major difference', () => {
      const result = versionDiff('1.0.0', '2.0.0')
      expect(result).toBe('major')
    })

    it('should return minor for minor difference', () => {
      const result = versionDiff('1.0.0', '1.1.0')
      expect(result).toBe('minor')
    })

    it('should return patch for patch difference', () => {
      const result = versionDiff('1.0.0', '1.0.1')
      expect(result).toBe('patch')
    })

    it('should return undefined for same versions', () => {
      const result = versionDiff('1.0.0', '1.0.0')
      expect(result).toBeUndefined()
    })

    it('should return premajor for premajor difference', () => {
      const result = versionDiff('1.0.0', '2.0.0-alpha')
      expect(result).toBe('premajor')
    })

    it('should return preminor for preminor difference', () => {
      const result = versionDiff('1.0.0', '1.1.0-beta')
      expect(result).toBe('preminor')
    })

    it('should return prepatch for prepatch difference', () => {
      const result = versionDiff('1.0.0', '1.0.1-rc')
      expect(result).toBe('prepatch')
    })

    it('should return prerelease for prerelease difference', () => {
      const result = versionDiff('1.0.0-alpha.0', '1.0.0-alpha.1')
      expect(result).toBe('prerelease')
    })

    it('should throw for invalid versions', () => {
      expect(() => versionDiff('invalid', '1.0.0')).toThrow()
    })

    it('should handle reverse comparison', () => {
      const result = versionDiff('2.0.0', '1.0.0')
      expect(result).toBe('major')
    })
  })

  describe('edge cases', () => {
    it('should handle very large version numbers', () => {
      const result = isValidVersion('999.999.999')
      expect(result).toBe(true)
    })

    it('should handle zero versions', () => {
      const result = compareVersions('0.0.0', '0.0.1')
      expect(result).toBe(-1)
    })

    it('should handle complex prerelease identifiers', () => {
      const result = isValidVersion('1.0.0-alpha.beta.gamma.1.2.3')
      expect(result).toBe(true)
    })

    it('should handle multiple build metadata parts', () => {
      const result = parseVersion('1.0.0+build.2024.01.15')
      expect(result?.build).toEqual(['build', '2024', '01', '15'])
    })

    it('should handle sorting with mixed prerelease', () => {
      const versions = ['1.0.0', '1.0.0-rc', '1.0.0-beta', '1.0.0-alpha']
      const result = sortVersions(versions)
      expect(result[0]).toBe('1.0.0-alpha')
      expect(result[3]).toBe('1.0.0')
    })

    it('should handle filtering with OR ranges', () => {
      const versions = ['1.0.0', '2.0.0', '3.0.0']
      const result = filterVersions(versions, '1.x || 3.x')
      expect(result).toEqual(['1.0.0', '3.0.0'])
    })

    it('should handle increment from prerelease', () => {
      const result = incrementVersion('1.0.0-alpha.0', 'patch')
      expect(result).toBe('1.0.0')
    })

    it('should handle coercion of npm-style versions', () => {
      const result = coerceVersion('=1.2.3')
      expect(result).toBe('1.2.3')
    })

    it('should handle max with invalid versions mixed in', () => {
      const versions = ['1.0.0', '2.0.0', '1.5.0']
      const result = maxVersion(versions)
      expect(result).toBe('2.0.0')
    })

    it('should handle min with only prerelease versions', () => {
      const versions = ['1.0.0-alpha', '1.0.0-beta', '1.0.0-rc']
      const result = minVersion(versions)
      expect(result).toBeUndefined()
    })
  })
})
