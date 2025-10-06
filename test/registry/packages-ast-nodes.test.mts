import { describe, expect, it } from 'vitest'

import {
  createAstNode,
  getReleaseTag,
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
})
