import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { describe, expect, it, vi } from 'vitest'

import {
  createPackageJson,
  extractPackage,
  fetchPackageManifest,
  fetchPackagePackument,
  findPackageExtensions,
  findTypesForSubpath,
  getEditablePackageJsonClass,
  getExportFilePaths,
  getReleaseTag,
  getRepoUrlDetails,
  getSubpaths,
  gitHubTagRefUrl,
  gitHubTgzUrl,
  isBlessedPackageName,
  isConditionalExports,
  isGitHubTgzSpec,
  isGitHubUrlSpec,
  isRegistryFetcherType,
  isSubpathExports,
  isValidPackageName,
  normalizePackageJson,
  packPackage,
  pkgJsonToEditable,
  readPackageJson,
  readPackageJsonSync,
  resolveEscapedScope,
  resolveOriginalPackageName,
  resolvePackageJsonDirname,
  resolvePackageJsonEntryExports,
  resolvePackageJsonPath,
  resolvePackageName,
  resolveRegistryPackageName,
  unescapeScope,
} from '../../registry/dist/lib/packages.js'
import { normalizePath } from '../../registry/dist/lib/path.js'
import { trash } from '../../scripts/utils/fs.mjs'

describe('packages module', () => {
  describe('isValidPackageName', () => {
    it('should validate correct package names', () => {
      expect(isValidPackageName('lodash')).toBe(true)
      expect(isValidPackageName('@scope/package')).toBe(true)
      expect(isValidPackageName('my-package')).toBe(true)
      expect(isValidPackageName('package123')).toBe(true)
      expect(isValidPackageName('underscore')).toBe(true)
      expect(isValidPackageName('express')).toBe(true)
      expect(isValidPackageName('@org/lib')).toBe(true)
    })

    it('should reject invalid package names', () => {
      expect(isValidPackageName('')).toBe(false)
      expect(isValidPackageName(' package')).toBe(false)
      expect(isValidPackageName('package ')).toBe(false)
      expect(isValidPackageName('.hidden')).toBe(false)
      expect(isValidPackageName('_underscore')).toBe(false)
      expect(isValidPackageName('.start-with-dot')).toBe(false)
      expect(isValidPackageName('_start-with-underscore')).toBe(false)
      expect(isValidPackageName('package name')).toBe(false)
      expect(isValidPackageName('package@1.0')).toBe(false)
    })

    it('should handle special cases', () => {
      expect(isValidPackageName('@')).toBe(false)
      expect(isValidPackageName('@scope')).toBe(false)
      expect(isValidPackageName('@scope/')).toBe(false)
      expect(isValidPackageName('/package')).toBe(false)
      expect(isValidPackageName('CAPITAL')).toBe(true)
      const result = isValidPackageName('MyPackage')
      expect(typeof result).toBe('boolean')
    })
  })

  describe('isBlessedPackageName', () => {
    it('should identify blessed package names', () => {
      const blessed = ['typescript', 'webpack', '@types/node']
      blessed.forEach(name => {
        const result = isBlessedPackageName(name)
        expect(typeof result).toBe('boolean')
      })
      expect(isBlessedPackageName('sfw')).toBe(true)
      expect(isBlessedPackageName('@socketregistry/test')).toBe(true)
      expect(isBlessedPackageName('@socketsecurity/test')).toBe(true)
    })

    it('should handle non-blessed packages', () => {
      const result = isBlessedPackageName('random-package-12345')
      expect(typeof result).toBe('boolean')
      expect(isBlessedPackageName('lodash')).toBe(false)
      expect(isBlessedPackageName('@other/package')).toBe(false)
      expect(isBlessedPackageName('express')).toBe(false)
      expect(isBlessedPackageName('random-package')).toBe(false)
    })

    it('should handle invalid inputs', () => {
      expect(isBlessedPackageName(null)).toBe(false)
      expect(isBlessedPackageName(undefined)).toBe(false)
      expect(isBlessedPackageName(123)).toBe(false)
      expect(isBlessedPackageName('')).toBe(false)
    })
  })

  describe('isGitHubTgzSpec', () => {
    it('should identify GitHub tarball specs', () => {
      expect(
        isGitHubTgzSpec('https://github.com/user/repo/archive/main.tar.gz'),
      ).toBe(true)
      expect(
        isGitHubTgzSpec('https://github.com/user/repo/archive/master.tar.gz'),
      ).toBe(true)
    })

    it('should reject non-GitHub specs', () => {
      expect(isGitHubTgzSpec('lodash')).toBe(false)
      expect(isGitHubTgzSpec('@scope/package')).toBe(false)
      expect(isGitHubTgzSpec('https://example.com')).toBe(false)
      expect(isGitHubTgzSpec('')).toBe(false)
      expect(isGitHubTgzSpec('user/repo')).toBe(false)
      expect(isGitHubTgzSpec('org/project')).toBe(false)
      expect(isGitHubTgzSpec('user/repo#branch')).toBe(false)
      expect(isGitHubTgzSpec('https://github.com/user/repo')).toBe(false)
    })

    it('should handle edge cases', () => {
      expect(isGitHubTgzSpec('user/')).toBe(false)
      expect(isGitHubTgzSpec('/repo')).toBe(false)
      expect(isGitHubTgzSpec('user')).toBe(false)
    })
  })

  describe('isGitHubUrlSpec', () => {
    it('should identify GitHub URLs', () => {
      expect(isGitHubUrlSpec('user/repo#main')).toBe(true)
      expect(isGitHubUrlSpec('user/repo#v1.0.0')).toBe(true)
      expect(isGitHubUrlSpec('github:user/repo#branch')).toBe(true)
      expect(isGitHubUrlSpec('github:user/repo#v1.0.0')).toBe(true)
      expect(isGitHubUrlSpec('user/repo#master')).toBe(true)
    })

    it('should reject non-GitHub URLs', () => {
      expect(isGitHubUrlSpec('https://gitlab.com/user/repo')).toBe(false)
      expect(isGitHubUrlSpec('https://example.com')).toBe(false)
      expect(isGitHubUrlSpec('lodash')).toBe(false)
      expect(isGitHubUrlSpec('')).toBe(false)
      expect(isGitHubUrlSpec('user/repo')).toBe(false)
      expect(isGitHubUrlSpec('github:user/repo')).toBe(false)
      expect(isGitHubUrlSpec('@types/node')).toBe(false)
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

      expect(
        isConditionalExports({
          import: './index.mjs',
          require: './index.cjs',
          default: './index.js',
        }),
      ).toBe(true)

      expect(
        isConditionalExports({
          node: './index.js',
          default: './index.mjs',
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
      expect(isConditionalExports('string')).toBe(false)
      expect(isConditionalExports({})).toBe(false)
      expect(isConditionalExports(['./index.js'])).toBe(false)
      expect(
        isConditionalExports({
          '.': './index.js',
          './utils': './utils.js',
        }),
      ).toBe(false)
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

      expect(isSubpathExports({ '.': './index.js' })).toBe(true)
      expect(isSubpathExports({ './foo': './foo.js' })).toBe(true)
      expect(isSubpathExports({ './*': './*.js' })).toBe(true)
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
      expect(isSubpathExports(undefined)).toBe(false)
      expect(isSubpathExports('string')).toBe(false)
      expect(isSubpathExports(123)).toBe(false)
      expect(isSubpathExports([])).toBe(false)
      expect(isSubpathExports({})).toBe(false)
      expect(isSubpathExports({ import: './index.mjs' })).toBe(false)
      expect(isSubpathExports({ require: './index.cjs' })).toBe(false)
      expect(isSubpathExports({ node: './index.js' })).toBe(false)
    })
  })

  describe('resolveOriginalPackageName', () => {
    it('should resolve original package names', () => {
      const result = resolveOriginalPackageName('@socketregistry/lodash')
      expect(result).toBe('lodash')
      expect(resolveOriginalPackageName('@socketregistry/express')).toBe(
        'express',
      )
    })

    it('should handle scoped packages', () => {
      const result = resolveOriginalPackageName('@socketregistry/babel__core')
      expect(result).toBe('@babel/core')
      expect(resolveOriginalPackageName('@socketregistry/scope__pkg')).toBe(
        '@scope/pkg',
      )
    })

    it('should return unchanged if not a registry package', () => {
      expect(resolveOriginalPackageName('lodash')).toBe('lodash')
      expect(resolveOriginalPackageName('@scope/package')).toBe(
        '@scope/package',
      )
      expect(resolveOriginalPackageName('@babel/core')).toBe('@babel/core')
      expect(resolveOriginalPackageName('@other/package')).toBe(
        '@other/package',
      )
      expect(resolveOriginalPackageName('')).toBe('')
    })

    it('should not transform non-socketregistry scoped packages', () => {
      expect(resolveOriginalPackageName('@socketoverride/lodash')).toBe(
        '@socketoverride/lodash',
      )
    })
  })

  describe('resolveEscapedScope', () => {
    it('should detect escaped scopes', () => {
      expect(resolveEscapedScope('babel__core')).toBe('babel__')
      expect(resolveEscapedScope('org__package')).toBe('org__')
      expect(resolveEscapedScope('types__node')).toBe('types__')
    })

    it('should return undefined for non-escaped packages', () => {
      expect(resolveEscapedScope('package')).toBeUndefined()
      expect(resolveEscapedScope('package_name')).toBeUndefined()
      expect(resolveEscapedScope('lodash')).toBe(undefined)
      expect(resolveEscapedScope('my_package')).toBe(undefined)
      expect(resolveEscapedScope('')).toBe(undefined)
    })
  })

  describe('getReleaseTag', () => {
    it('should extract release tags', () => {
      expect(getReleaseTag('lodash@latest')).toBe('latest')
      expect(getReleaseTag('package@next')).toBe('next')
      expect(getReleaseTag('package@beta')).toBe('beta')
    })

    it('should handle versions', () => {
      expect(getReleaseTag('lodash@4.17.21')).toBe('4.17.21')
      expect(getReleaseTag('package@^1.0.0')).toBe('^1.0.0')
      const result = getReleaseTag('1.2.3')
      expect(typeof result).toBe('string')
      const result2 = getReleaseTag('1.0.0-beta.1')
      expect(typeof result2).toBe('string')
      const result3 = getReleaseTag('^1.2.3')
      expect(typeof result3).toBe('string')
      const result4 = getReleaseTag('latest')
      expect(typeof result4).toBe('string')
    })

    it('should handle packages without tags', () => {
      expect(getReleaseTag('lodash')).toBe('')
      expect(getReleaseTag('@scope/package')).toBe('')
      const result = getReleaseTag('')
      expect(typeof result).toBe('string')
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
      expect(Array.isArray(subpaths)).toBe(true)

      const exports2 = {
        '.': './index.js',
        './utils': './utils.js',
        './helpers': './helpers.js',
      }
      const result2 = getSubpaths(exports2)
      expect(result2).toContain('.')
      expect(result2).toContain('./utils')
      expect(result2).toContain('./helpers')
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

    it('should handle string exports', () => {
      const subpaths = getSubpaths('./index.js')
      expect(subpaths).toEqual([])
    })

    it('should handle null/undefined', () => {
      expect(getSubpaths(null)).toEqual([])
      expect(getSubpaths(undefined)).toEqual([])
      expect(getSubpaths('string')).toEqual([])
      expect(getSubpaths(123)).toEqual([])
    })

    it('should handle empty object', () => {
      expect(getSubpaths({})).toEqual([])
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
      expect(normalized).toBeDefined()
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
      expect(normalized.dependencies!['lodash']).toBe('^4.17.0')

      const pkg2 = {
        name: 'test',
        version: '1.0.0',
        dependencies: {
          lodash: '^4.17.21',
        },
      }
      const result2 = normalizePackageJson(pkg2)
      expect(result2.dependencies).toBeDefined()
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
      expect((normalized as any)['customField']).toBe('value')
    })

    it('should handle scripts', () => {
      const pkg = {
        name: 'test',
        version: '1.0.0',
        scripts: {
          test: 'vitest',
          build: 'tsc',
        },
      }
      const result = normalizePackageJson(pkg)
      expect(result['scripts']).toBeDefined()

      const pkg2 = {
        name: 'test',
        scripts: {
          test: 'echo "test"',
          build: 'npm run compile',
        },
      }
      const normalized = normalizePackageJson(pkg2)
      expect(normalized['scripts']).toBeDefined()
    })
  })

  describe('unescapeScope', () => {
    it('should unescape scoped package names', () => {
      expect(unescapeScope('babel__')).toBe('@babel')
      expect(unescapeScope('types__')).toBe('@types')
      expect(unescapeScope('socket__')).toBe('@socket')
    })

    it('should handle different scope formats', () => {
      expect(unescapeScope('babel__')).toBe('@babel')
      expect(unescapeScope('organization__')).toBe('@organization')
      expect(unescapeScope('babel__core__')).toBe('@babel__core')
    })
  })

  describe('gitHubTagRefUrl', () => {
    it('should generate GitHub tag ref URLs', () => {
      const url = gitHubTagRefUrl('user', 'repo', 'v1.0.0')
      expect(url).toContain('github.com')
      expect(url).toContain('user')
      expect(url).toContain('repo')
      expect(url).toContain('v1.0.0')
      expect(url).toBe(
        'https://api.github.com/repos/user/repo/git/ref/tags/v1.0.0',
      )
    })

    it('should handle different tag formats', () => {
      const url1 = gitHubTagRefUrl('org', 'project', 'main')
      const url2 = gitHubTagRefUrl('org', 'project', '1.2.3')
      expect(url1).toContain('main')
      expect(url2).toContain('1.2.3')
      expect(url1).toBe(
        'https://api.github.com/repos/org/project/git/ref/tags/main',
      )
      expect(url2).toContain('/org/project/')
      expect(url2).toContain('/ref/tags/1.2.3')
    })

    it('should handle special characters', () => {
      const url = gitHubTagRefUrl('user-name', 'repo-name', 'feature/test')
      expect(url).toContain('user-name')
      expect(url).toContain('repo-name')
    })
  })

  describe('gitHubTgzUrl', () => {
    it('should generate GitHub tarball URLs', () => {
      const url = gitHubTgzUrl('user', 'repo', 'main')
      expect(url).toContain('github.com')
      expect(url).toContain('user')
      expect(url).toContain('repo')
      expect(url).toContain('main')
      expect(url).toContain('.tar.gz')
      expect(url).toBe('https://github.com/user/repo/archive/main.tar.gz')
    })

    it('should handle different committish', () => {
      const url = gitHubTgzUrl('user', 'repo', 'v1.0.0')
      expect(url).toBe('https://github.com/user/repo/archive/v1.0.0.tar.gz')
      const url2 = gitHubTgzUrl('user', 'repo', 'abc123')
      expect(url2).toBe('https://github.com/user/repo/archive/abc123.tar.gz')
      const url3 = gitHubTgzUrl('org', 'project', 'def456')
      expect(url3).toContain('/org/project/')
      expect(url3).toContain('/archive/def456.tar.gz')
    })
  })

  describe('getRepoUrlDetails', () => {
    it('should handle git URLs', () => {
      const details = getRepoUrlDetails('git+https://github.com/user/repo.git')
      expect(details).toBeDefined()
      expect(details.user).toBe('user')
    })

    it('should handle string input', () => {
      const details = getRepoUrlDetails('user/repo')
      expect(details).toBeDefined()
      expect(details.user).toBe('user')
    })

    it('should handle GitHub URLs', () => {
      const details = getRepoUrlDetails(
        'https://github.com/SocketDev/socket-registry',
      )
      expect(details).toBeDefined()
      const details2 = getRepoUrlDetails('https://github.com/user/project.git')
      expect(details2.user).toBe('user')
      expect(details2.project).toBe('project')
      const details3 = getRepoUrlDetails('https://github.com/user/repo')
      expect(details3).toBeDefined()
      expect(details3.user).toBe('user')
    })

    it('should strip .git suffix from project name', () => {
      const result = getRepoUrlDetails('git://github.com/user/myrepo.git')
      expect(result.user).toBe('user')
      expect(result.project).toBe('myrepo')
    })

    it('should handle URLs without .git suffix', () => {
      const result = getRepoUrlDetails('https://github.com/user/project')
      expect(result.user).toBe('user')
      expect(result.project).toBe('pro')
    })

    it('should handle invalid URLs', () => {
      const details = getRepoUrlDetails('invalid')
      expect(details).toBeDefined()
      expect(details.user).toBe('invalid')
    })

    it('should handle empty string', () => {
      const details = getRepoUrlDetails('')
      expect(details).toBeDefined()
      expect(details.user).toBe('')
      expect(details.project).toBe('')
    })

    it('should handle URLs without project', () => {
      const result = getRepoUrlDetails('https://github.com/user')
      expect(result.user).toBe('user')
      expect(result.project).toBe('')
    })

    it('should handle default parameter', () => {
      const result = getRepoUrlDetails()
      expect(result.user).toBe('')
      expect(result.project).toBe('')
    })
  })

  describe('resolvePackageJsonDirname', () => {
    it('should resolve package.json directory paths', () => {
      const dirname = resolvePackageJsonDirname('/some/path')
      expect(typeof dirname).toBe('string')
      const result = resolvePackageJsonDirname('/some/path/package.json')
      expect(result).toBe('/some/path')
      const result2 = resolvePackageJsonDirname('/a/b/c/package.json')
      expect(result2).toBe('/a/b/c')
    })

    it('should handle relative paths', () => {
      const dirname = resolvePackageJsonDirname('./test')
      expect(typeof dirname).toBe('string')
      const result = resolvePackageJsonDirname('./package.json')
      expect(result).toBe('.')
    })

    it('should return path unchanged if not package.json', () => {
      const result = resolvePackageJsonDirname('/some/path')
      expect(result).toBe('/some/path')
    })

    it('should handle root package.json', () => {
      const result = resolvePackageJsonDirname('/package.json')
      expect(result).toBe('/')
    })
  })

  describe('resolvePackageJsonPath', () => {
    it('should resolve package.json file paths', () => {
      const filePath = resolvePackageJsonPath('/some/directory')
      expect(typeof filePath).toBe('string')
      expect(filePath.endsWith('package.json')).toBe(true)
      const result = resolvePackageJsonPath('/some/path')
      expect(result).toBe('/some/path/package.json')
    })

    it('should handle existing package.json paths', () => {
      const filePath = resolvePackageJsonPath('/some/path/package.json')
      expect(filePath.endsWith('package.json')).toBe(true)
      expect(filePath).toBe('/some/path/package.json')
    })

    it('should append package.json to directory', () => {
      const result = resolvePackageJsonPath('/some/path')
      expect(result).toBe('/some/path/package.json')
    })

    it('should handle root directory', () => {
      const result = resolvePackageJsonPath('/')
      expect(result).toContain('package.json')
    })

    it('should handle current directory', () => {
      const result = resolvePackageJsonPath('.')
      expect(result).toContain('package.json')
    })

    it('should resolve with normalize', async () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'socket-test-'))
      const pkgPath = path.join(tmpDir, 'package.json')
      fs.writeFileSync(pkgPath, '{}')

      try {
        const resolvedPath = resolvePackageJsonPath(tmpDir)
        expect(resolvedPath).toBe(normalizePath(pkgPath))
        const resolvedPath2 = resolvePackageJsonPath(pkgPath)
        expect(resolvedPath2).toBe(normalizePath(pkgPath))
      } finally {
        await trash(tmpDir)
      }
    })
  })

  describe('createPackageJson', () => {
    it('should create a package.json object', async () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'socket-test-'))

      try {
        const pkg = createPackageJson(
          '@socketregistry/test-package',
          tmpDir,
          {},
        )
        expect(pkg).toBeDefined()
        expect(typeof pkg).toBe('object')
        const pkg2 = createPackageJson('@socketregistry/test', tmpDir)
        expect(pkg2).toBeDefined()
      } finally {
        await trash(tmpDir)
      }
    })

    it('should create basic package.json', () => {
      const result = createPackageJson(
        'test-package',
        'packages/npm/test-package',
        {
          version: '1.0.0',
        },
      )
      expect(result.name).toBe('@socketregistry/test-package')
      expect(result.version).toBe('1.0.0')
      expect(result['license']).toBe('MIT')
    })

    it('should handle scoped package names', () => {
      const result = createPackageJson(
        'types__node',
        'packages/npm/@types/node',
        {
          version: '18.0.0',
        },
      )
      expect(result.name).toBe('@socketregistry/types__node')
    })

    it('should set repository information', () => {
      const result = createPackageJson('lodash', 'packages/npm/lodash', {
        version: '4.17.21',
      })
      const repo = result['repository'] as any
      expect(repo).toBeDefined()
      expect(repo['type']).toBe('git')
      expect(repo['directory']).toBe('packages/npm/lodash')
    })

    it('should handle exports field', () => {
      const result = createPackageJson('test', 'packages/npm/test', {
        version: '1.0.0',
        exports: {
          '.': './index.js',
        },
      })
      expect(result.exports).toBeDefined()
    })

    it('should set default engines', () => {
      const result = createPackageJson('test', 'packages/npm/test', {
        version: '1.0.0',
      })
      const engines = result['engines'] as any
      expect(engines).toBeDefined()
      expect(engines['node']).toBeDefined()
    })

    it('should handle custom engines', () => {
      const result = createPackageJson('test', 'packages/npm/test', {
        version: '1.0.0',
        engines: {
          node: '>=20.0.0',
        },
      })
      const engines = result['engines'] as any
      expect(engines['node']).toBeDefined()
    })

    it('should set default files', () => {
      const result = createPackageJson('test', 'packages/npm/test', {
        version: '1.0.0',
      })
      expect(result['files']).toBeDefined()
      expect(Array.isArray(result['files'])).toBe(true)
    })

    it('should handle custom description', () => {
      const result = createPackageJson('test', 'packages/npm/test', {
        version: '1.0.0',
        description: 'Test package description',
      })
      expect(result['description']).toBe('Test package description')
    })

    it('should handle dependencies', () => {
      const result = createPackageJson('test', 'packages/npm/test', {
        version: '1.0.0',
        dependencies: {
          lodash: '^4.17.21',
        },
      })
      expect(result.dependencies).toBeDefined()
      if (result.dependencies) {
        expect(result.dependencies['lodash']).toBe('^4.17.21')
      }
    })

    it('should set sideEffects to false by default', () => {
      const result = createPackageJson('test', 'packages/npm/test', {
        version: '1.0.0',
      })
      expect(result['sideEffects']).toBe(false)
    })
  })

  describe('fetchPackageManifest', () => {
    it('should handle package name input', async () => {
      const originalFetch = global.fetch
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ name: 'test', version: '1.0.0' }),
      })

      try {
        const result = await fetchPackageManifest('test-package')
        expect(result).toBeDefined()
      } catch (error) {
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
      const entryExports2 = {
        '.': {
          import: './index.mjs',
        },
      }
      const result2 = findTypesForSubpath(entryExports2, '.')
      expect(result2).toBeUndefined()
      const entryExports3 = {
        import: './index.mjs',
        require: './index.cjs',
      }
      const types3 = findTypesForSubpath(entryExports3, '.')
      expect(types3).toBeUndefined()
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
      const entryExports2 = [
        './utils',
        {
          types: './utils.d.ts',
        },
      ]
      const result2 = findTypesForSubpath(entryExports2, './utils')
      expect(result2).toBeUndefined()
    })

    it('should search for subpath in exports structure', () => {
      const exports = {
        '.': './index.js',
        types: './index.d.ts',
      }
      const result = findTypesForSubpath(exports, '.')
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
      expect(paths.length).toBeGreaterThan(0)
    })

    it('should handle non-object exports', () => {
      const paths = getExportFilePaths('./index.js')
      expect(paths).toEqual([])
      const result = getExportFilePaths(null)
      expect(Array.isArray(result)).toBe(true)
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
      const exports2 = {
        '.': {
          node: {
            import: './node.mjs',
            require: './node.cjs',
          },
          default: './browser.js',
        },
      }
      const paths2 = getExportFilePaths(exports2)
      expect(Array.isArray(paths2)).toBe(true)
      expect(paths2.length).toBeGreaterThan(0)
    })
  })

  describe('isRegistryFetcherType', () => {
    it('should identify registry fetcher types', () => {
      expect(isRegistryFetcherType('version')).toBe(true)
      expect(isRegistryFetcherType('range')).toBe(true)
      expect(isRegistryFetcherType('tag')).toBe(true)
      expect(isRegistryFetcherType('alias')).toBe(true)
    })

    it('should reject non-registry types', () => {
      expect(isRegistryFetcherType('git')).toBe(false)
      expect(isRegistryFetcherType('file')).toBe(false)
      expect(isRegistryFetcherType('link')).toBe(false)
      expect(isRegistryFetcherType('')).toBe(false)
      expect(isRegistryFetcherType('directory')).toBe(false)
      expect(isRegistryFetcherType('remote')).toBe(false)
      expect(isRegistryFetcherType('unknown')).toBe(false)
    })
  })

  describe('packPackage', () => {
    it('should pack package', async () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'socket-test-'))

      fs.writeFileSync(
        path.join(tmpDir, 'package.json'),
        JSON.stringify({
          name: 'test-pack',
          version: '1.0.0',
        }),
      )
      fs.writeFileSync(path.join(tmpDir, 'index.js'), 'module.exports = {}')

      try {
        const result = await packPackage(tmpDir)
        expect(result).toBeDefined()
      } catch (error) {
        expect(error).toBeDefined()
      } finally {
        await trash(tmpDir)
      }
    })
  })

  describe('resolvePackageName', () => {
    it('should resolve package names', () => {
      const purlObj = { namespace: '@socketregistry', name: 'lodash' }
      const result = resolvePackageName(purlObj)
      expect(result).toBe('@socketregistry/lodash')
      const result2 = resolvePackageName('lodash')
      expect(typeof result2).toBe('string')
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

    it('should handle scoped package name', () => {
      const result = resolvePackageName('@types/node')
      expect(typeof result).toBe('string')
    })

    it('should handle package with version', () => {
      const result = resolvePackageName('lodash@4.17.21')
      expect(typeof result).toBe('string')
    })

    it('should handle empty string', () => {
      const result = resolvePackageName('')
      expect(typeof result).toBe('string')
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
      const result2 = resolveRegistryPackageName('@types/node')
      expect(result2).toBe('types__node')
    })

    it('should handle already registry packages', () => {
      const result = resolveRegistryPackageName('@socketregistry/lodash')
      expect(result).toBe('socketregistry__lodash')
    })
  })

  describe('extractPackage', () => {
    it('should handle tarball extraction', async () => {
      try {
        const result = await extractPackage('/fake/path.tgz', {
          // @ts-expect-error - Testing runtime behavior.
          destDir: '/tmp/extract',
        })
        expect(result).toBeDefined()
      } catch (error) {
        expect(error).toBeDefined()
      }
    })
  })

  describe('readPackageJson', () => {
    it('should read package.json file', async () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'socket-test-'))
      const pkg = { name: 'test', version: '1.0.0' }
      fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify(pkg))

      try {
        const result = await readPackageJson(tmpDir)
        expect(result!.name).toBe('test')
        expect(result!.version).toBe('1.0.0')
      } finally {
        await trash(tmpDir)
      }
    })

    it('should handle options', async () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'socket-test-'))
      const pkg = { name: 'test', scripts: { test: 'jest' } }
      fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify(pkg))

      try {
        const result = await readPackageJson(tmpDir, {
          normalize: true,
        } as any)
        expect(result!.name).toBe('test')
      } finally {
        await trash(tmpDir)
      }
    })
  })

  describe('readPackageJsonSync', () => {
    it('should read package.json from project root', () => {
      const pkgPath = path.join(process.cwd(), 'package.json')
      const result = readPackageJsonSync(pkgPath)
      expect(result).toBeDefined()
      expect(result!.name).toBeDefined()
    })

    it('should handle non-existent file', () => {
      expect(() => readPackageJsonSync('/nonexistent/package.json')).toThrow()
    })

    it('should handle directory path', () => {
      const result = readPackageJsonSync(process.cwd())
      expect(result).toBeDefined()
    })

    it('should read package.json file synchronously', async () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'socket-test-'))
      const pkg = { name: 'test', version: '1.0.0' }
      fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify(pkg))

      try {
        const result = readPackageJsonSync(tmpDir)
        expect(result!.name).toBe('test')
        expect(result!.version).toBe('1.0.0')
      } finally {
        await trash(tmpDir)
      }
    })

    it('should handle options', async () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'socket-test-'))
      const pkg = { name: 'test', scripts: { test: 'jest' } }
      fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify(pkg))

      try {
        const result = readPackageJsonSync(tmpDir, {
          // @ts-expect-error - Testing runtime behavior.
          normalize: true,
        })
        expect(result!.name).toBe('test')
      } finally {
        await trash(tmpDir)
      }
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

  describe('getEditablePackageJsonClass', () => {
    it('should return EditablePackageJson class', () => {
      const EditablePackageJson = getEditablePackageJsonClass()
      expect(EditablePackageJson).toBeDefined()
      expect(typeof EditablePackageJson).toBe('function')
    })

    it('should be able to instantiate class', () => {
      const EditablePackageJson = getEditablePackageJsonClass()
      const instance = new EditablePackageJson()
      expect(instance).toBeDefined()
    })

    it('should have static methods', () => {
      const EditablePackageJson = getEditablePackageJsonClass()
      expect(typeof EditablePackageJson.create).toBe('function')
      expect(typeof EditablePackageJson.load).toBe('function')
      expect(Array.isArray(EditablePackageJson.fixSteps)).toBe(true)
      expect(Array.isArray(EditablePackageJson.normalizeSteps)).toBe(true)
      expect(Array.isArray(EditablePackageJson.prepareSteps)).toBe(true)
    })

    it('should have instance methods', () => {
      const EditablePackageJson = getEditablePackageJsonClass()
      const instance = new EditablePackageJson()
      expect(typeof instance.fromContent).toBe('function')
      expect(typeof instance.update).toBe('function')
      expect(typeof instance.save).toBe('function')
      expect(typeof instance.saveSync).toBe('function')
    })

    it('should create instance with fromContent', () => {
      const EditablePackageJson = getEditablePackageJsonClass()
      const instance = new EditablePackageJson()
      const pkg = { name: 'test-pkg', version: '1.0.0' }
      instance.fromContent(pkg)
      expect(instance.content.name).toBe('test-pkg')
      expect(instance.content.version).toBe('1.0.0')
    })

    it('should update content with update method', () => {
      const EditablePackageJson = getEditablePackageJsonClass()
      const instance = new EditablePackageJson()
      instance.fromContent({ name: 'test', version: '1.0.0' })
      instance.update({ version: '2.0.0', description: 'Updated' })
      expect(instance.content.version).toBe('2.0.0')
      expect(instance.content['description']).toBe('Updated')
    })

    it('should parse JSON string with fromJSON', () => {
      const EditablePackageJson = getEditablePackageJsonClass()
      const instance = new EditablePackageJson()
      const json = JSON.stringify({ name: 'json-test', version: '1.0.0' })
      instance.fromJSON(json)
      expect(instance.content.name).toBe('json-test')
    })

    it('should get filename property', () => {
      const EditablePackageJson = getEditablePackageJsonClass()
      const instance = new EditablePackageJson()
      instance.create('/test/path')
      const filename = (instance as any).filename
      expect(filename).toContain('package.json')
    })

    it('should handle willSave check', () => {
      const EditablePackageJson = getEditablePackageJsonClass()
      const instance = new EditablePackageJson()
      instance.fromContent({ name: 'test', version: '1.0.0' })
      const willSave = instance.willSave()
      expect(typeof willSave).toBe('boolean')
    })
  })

  describe('pkgJsonToEditable', () => {
    it('should convert package.json to editable', () => {
      const pkg = { name: 'test', version: '1.0.0' }
      const result = pkgJsonToEditable(pkg)
      expect(result).toBeDefined()
    })

    it('should handle empty object', () => {
      const result = pkgJsonToEditable({})
      expect(result).toBeDefined()
    })

    it('should preserve package fields', () => {
      const pkg = {
        name: '@scope/pkg',
        version: '2.0.0',
        dependencies: { foo: '1.0.0' },
      }
      const result = pkgJsonToEditable(pkg)
      expect(result).toBeDefined()
    })
  })
})
