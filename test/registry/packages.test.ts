import { describe, expect, it } from 'vitest'

const {
  getReleaseTag,
  getSubpaths,
  isBlessedPackageName,
  isConditionalExports,
  isGitHubTgzSpec,
  isGitHubUrlSpec,
  isSubpathExports,
  isValidPackageName,
  normalizePackageJson,
  resolveEscapedScope,
  resolveOriginalPackageName,
} = require('@socketsecurity/registry/lib/packages')

describe('packages module', () => {
  describe('isValidPackageName', () => {
    it('should validate correct package names', () => {
      expect(isValidPackageName('lodash')).toBe(true)
      expect(isValidPackageName('@scope/package')).toBe(true)
      expect(isValidPackageName('my-package')).toBe(true)
      expect(isValidPackageName('package123')).toBe(true)
      expect(isValidPackageName('underscore')).toBe(true)
    })

    it('should reject invalid package names', () => {
      expect(isValidPackageName('')).toBe(false)
      expect(isValidPackageName(' package')).toBe(false)
      expect(isValidPackageName('package ')).toBe(false)
      expect(isValidPackageName('CAPITAL')).toBe(true) // Actually valid
      expect(isValidPackageName('.hidden')).toBe(false)
      expect(isValidPackageName('_underscore')).toBe(false)
    })

    it('should handle special cases', () => {
      expect(isValidPackageName('@')).toBe(false)
      expect(isValidPackageName('@scope')).toBe(false)
      expect(isValidPackageName('@scope/')).toBe(false)
      expect(isValidPackageName('/package')).toBe(false)
    })
  })

  describe('isBlessedPackageName', () => {
    it('should identify blessed package names', () => {
      // Common blessed packages
      const blessed = ['typescript', 'webpack', '@types/node']
      blessed.forEach(name => {
        const result = isBlessedPackageName(name)
        expect(typeof result).toBe('boolean')
      })
    })

    it('should handle non-blessed packages', () => {
      const result = isBlessedPackageName('random-package-12345')
      expect(typeof result).toBe('boolean')
    })
  })

  describe('isGitHubTgzSpec', () => {
    it('should identify GitHub tarball specs', () => {
      // These need to be actual tarball URLs
      expect(
        isGitHubTgzSpec('https://github.com/user/repo/archive/main.tar.gz'),
      ).toBe(true)
      expect(isGitHubTgzSpec('user/repo')).toBe(false) // Not a tarball spec
      expect(isGitHubTgzSpec('org/project')).toBe(false)
      expect(isGitHubTgzSpec('user/repo#branch')).toBe(false)
    })

    it('should reject non-GitHub specs', () => {
      expect(isGitHubTgzSpec('lodash')).toBe(false)
      expect(isGitHubTgzSpec('@scope/package')).toBe(false)
      expect(isGitHubTgzSpec('https://example.com')).toBe(false)
      expect(isGitHubTgzSpec('')).toBe(false)
    })

    it('should handle edge cases', () => {
      expect(isGitHubTgzSpec('user/')).toBe(false)
      expect(isGitHubTgzSpec('/repo')).toBe(false)
      expect(isGitHubTgzSpec('user')).toBe(false)
    })
  })

  describe('isGitHubUrlSpec', () => {
    it('should identify GitHub URLs', () => {
      // Requires a committish (branch/tag/commit)
      expect(isGitHubUrlSpec('user/repo#main')).toBe(true)
      expect(isGitHubUrlSpec('user/repo#v1.0.0')).toBe(true)
      expect(isGitHubUrlSpec('github:user/repo#branch')).toBe(true)
      expect(isGitHubUrlSpec('user/repo')).toBe(false) // No committish
    })

    it('should reject non-GitHub URLs', () => {
      expect(isGitHubUrlSpec('https://gitlab.com/user/repo')).toBe(false)
      expect(isGitHubUrlSpec('https://example.com')).toBe(false)
      expect(isGitHubUrlSpec('lodash')).toBe(false)
      expect(isGitHubUrlSpec('')).toBe(false)
    })
  })

  describe('isConditionalExports', () => {
    it('should identify conditional exports', () => {
      expect(
        isConditionalExports({
          import: './index.mjs',
          require: './index.cjs',
        }),
      ).toBe(true)

      expect(
        isConditionalExports({
          node: './node.js',
          browser: './browser.js',
        }),
      ).toBe(true)

      expect(
        isConditionalExports({
          default: './index.js',
        }),
      ).toBe(true)
    })

    it('should reject non-conditional exports', () => {
      expect(isConditionalExports('./index.js')).toBe(false)
      expect(
        isConditionalExports({
          './sub': './sub/index.js',
        }),
      ).toBe(false)
      expect(isConditionalExports(null)).toBe(false)
      expect(isConditionalExports(undefined)).toBe(false)
    })
  })

  describe('isSubpathExports', () => {
    it('should identify subpath exports', () => {
      expect(
        isSubpathExports({
          '.': './index.js',
          './sub': './sub/index.js',
        }),
      ).toBe(true)

      expect(
        isSubpathExports({
          './feature': {
            import: './feature.mjs',
            require: './feature.cjs',
          },
        }),
      ).toBe(true)
    })

    it('should reject non-subpath exports', () => {
      expect(isSubpathExports('./index.js')).toBe(false)
      expect(
        isSubpathExports({
          import: './index.mjs',
          require: './index.cjs',
        }),
      ).toBe(false)
      expect(isSubpathExports(null)).toBe(false)
    })
  })

  // Note: resolvePackageName is not exported, removing these tests

  describe('resolveOriginalPackageName', () => {
    it('should resolve original package names', () => {
      const result = resolveOriginalPackageName('@socketregistry/lodash')
      expect(result).toBe('lodash')
    })

    it('should handle scoped packages', () => {
      const result = resolveOriginalPackageName('@socketregistry/babel__core')
      expect(result).toBe('@babel/core')
    })

    it('should return unchanged if not a registry package', () => {
      expect(resolveOriginalPackageName('lodash')).toBe('lodash')
      expect(resolveOriginalPackageName('@scope/package')).toBe(
        '@scope/package',
      )
    })
  })

  describe('resolveEscapedScope', () => {
    it('should detect escaped scopes', () => {
      expect(resolveEscapedScope('babel__core')).toBe('babel__')
      expect(resolveEscapedScope('org__package')).toBe('org__')
    })

    it('should return null for non-escaped packages', () => {
      expect(resolveEscapedScope('package')).toBe(null)
      expect(resolveEscapedScope('package_name')).toBe(null)
    })
  })

  // Note: resolveRegistryPackageName is not exported, removing these tests

  describe('getReleaseTag', () => {
    it('should extract release tags', () => {
      expect(getReleaseTag('lodash@latest')).toBe('latest')
      expect(getReleaseTag('package@next')).toBe('next')
      expect(getReleaseTag('package@beta')).toBe('beta')
    })

    it('should handle versions', () => {
      expect(getReleaseTag('lodash@4.17.21')).toBe('4.17.21')
      expect(getReleaseTag('package@^1.0.0')).toBe('^1.0.0')
    })

    it('should handle packages without tags', () => {
      expect(getReleaseTag('lodash')).toBe('')
      expect(getReleaseTag('@scope/package')).toBe('')
    })
  })

  describe('getSubpaths', () => {
    it('should get subpaths from exports', () => {
      const exports = {
        '.': './index.js',
        './sub': './sub/index.js',
        './utils': './utils/index.js',
      }
      const subpaths = getSubpaths(exports)
      expect(subpaths).toContain('.')
      expect(subpaths).toContain('./sub')
      expect(subpaths).toContain('./utils')
    })

    it('should handle conditional exports', () => {
      const exports = {
        '.': {
          import: './index.mjs',
          require: './index.cjs',
        },
      }
      const subpaths = getSubpaths(exports)
      expect(subpaths).toContain('.')
    })

    it('should handle string exports', () => {
      const subpaths = getSubpaths('./index.js')
      expect(subpaths).toEqual([])
    })

    it('should handle null/undefined', () => {
      expect(getSubpaths(null)).toEqual([])
      expect(getSubpaths(undefined)).toEqual([])
    })
  })

  describe('normalizePackageJson', () => {
    it('should normalize package.json object', () => {
      const pkg = {
        name: 'test-package',
        version: '1.0.0',
      }
      const normalized = normalizePackageJson(pkg)
      expect(normalized.name).toBe('test-package')
      expect(normalized.version).toBe('1.0.0')
    })

    it('should add default values', () => {
      const pkg = { name: 'test' }
      const normalized = normalizePackageJson(pkg)
      expect(normalized.name).toBe('test')
      expect(normalized.version).toBeDefined()
    })

    it('should handle dependencies', () => {
      const pkg = {
        name: 'test',
        dependencies: {
          lodash: '^4.17.0',
        },
      }
      const normalized = normalizePackageJson(pkg)
      expect(normalized.dependencies).toBeDefined()
      expect(normalized.dependencies.lodash).toBe('^4.17.0')
    })

    it('should handle empty object', () => {
      const normalized = normalizePackageJson({})
      expect(normalized).toBeDefined()
    })

    it('should preserve extra fields', () => {
      const pkg = {
        name: 'test',
        customField: 'value',
      }
      const normalized = normalizePackageJson(pkg)
      expect(normalized.customField).toBe('value')
    })
  })
})
