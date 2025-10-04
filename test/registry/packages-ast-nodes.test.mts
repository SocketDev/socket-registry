import { describe, expect, it } from 'vitest'

import {
  createAstNode,
  createPackageJson,
  getReleaseTag,
  isBlessedPackageName,
  isConditionalExports,
  parseSpdxExp,
} from '../../registry/dist/lib/packages.js'

describe('packages module - utility functions', () => {
  describe('createAstNode', () => {
    it('should create AST node from parsed expression', () => {
      const ast = parseSpdxExp('MIT')
      if (ast) {
        const result = createAstNode(ast)
        expect(result).toBeDefined()
        expect(result.type).toBeDefined()
      }
    })

    it('should handle binary operations', () => {
      const ast = parseSpdxExp('MIT OR Apache-2.0')
      if (ast) {
        const result = createAstNode(ast)
        expect(result).toBeDefined()
      }
    })

    it('should handle complex expressions', () => {
      const ast = parseSpdxExp('(MIT OR GPL-2.0) AND Apache-2.0')
      if (ast) {
        const result = createAstNode(ast)
        expect(result).toBeDefined()
      }
    })
  })

  describe('isBlessedPackageName', () => {
    it('should identify blessed package names', () => {
      expect(isBlessedPackageName('@socketregistry/test')).toBe(true)
      expect(isBlessedPackageName('@socketsecurity/test')).toBe(true)
    })

    it('should reject non-blessed names', () => {
      expect(isBlessedPackageName('lodash')).toBe(false)
      expect(isBlessedPackageName('@other/package')).toBe(false)
    })

    it('should handle invalid inputs', () => {
      expect(isBlessedPackageName(null)).toBe(false)
      expect(isBlessedPackageName(undefined)).toBe(false)
      expect(isBlessedPackageName(123)).toBe(false)
    })

    it('should handle empty string', () => {
      expect(isBlessedPackageName('')).toBe(false)
    })
  })

  describe('isConditionalExports', () => {
    it('should identify conditional exports', () => {
      const exports = {
        import: './index.mjs',
        require: './index.cjs',
      }
      expect(isConditionalExports(exports)).toBe(true)
    })

    it('should identify node conditional exports', () => {
      const exports = {
        node: './index.js',
        default: './index.mjs',
      }
      expect(isConditionalExports(exports)).toBe(true)
    })

    it('should reject subpath exports', () => {
      const exports = {
        '.': './index.js',
        './utils': './utils.js',
      }
      expect(isConditionalExports(exports)).toBe(false)
    })

    it('should handle non-object inputs', () => {
      expect(isConditionalExports(null)).toBe(false)
      expect(isConditionalExports(undefined)).toBe(false)
      expect(isConditionalExports('string')).toBe(false)
    })

    it('should handle empty object', () => {
      expect(isConditionalExports({})).toBe(false)
    })
  })

  describe('getReleaseTag', () => {
    it('should extract release tag from version', () => {
      const result = getReleaseTag('1.2.3')
      expect(typeof result).toBe('string')
    })

    it('should handle prerelease versions', () => {
      const result = getReleaseTag('1.0.0-beta.1')
      expect(typeof result).toBe('string')
    })

    it('should handle version ranges', () => {
      const result = getReleaseTag('^1.2.3')
      expect(typeof result).toBe('string')
    })

    it('should handle latest', () => {
      const result = getReleaseTag('latest')
      expect(typeof result).toBe('string')
    })

    it('should handle empty string', () => {
      const result = getReleaseTag('')
      expect(typeof result).toBe('string')
    })
  })

  describe('createPackageJson', () => {
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
})
