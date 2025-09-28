import { describe, expect, it } from 'vitest'

const {
  findTypesForSubpath,
  getExportFilePaths,
  getSubpaths,
  isConditionalExports,
  isSubpathExports,
} = require('@socketsecurity/registry/lib/packages')

describe('packages exports tests', () => {
  describe('getSubpaths', () => {
    it('should get subpaths from exports object', () => {
      const exports = {
        '.': './index.js',
        './sub': './sub/index.js',
        './utils': './utils/index.js',
      }
      const subpaths = getSubpaths(exports)
      expect(Array.isArray(subpaths)).toBe(true)
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
      expect(Array.isArray(subpaths)).toBe(true)
      expect(subpaths).toContain('.')
    })

    it('should handle null exports', () => {
      const subpaths = getSubpaths(null)
      expect(Array.isArray(subpaths)).toBe(true)
      expect(subpaths.length).toBe(0)
    })

    it('should handle undefined exports', () => {
      const subpaths = getSubpaths(undefined)
      expect(Array.isArray(subpaths)).toBe(true)
      expect(subpaths.length).toBe(0)
    })
  })

  describe('isConditionalExports', () => {
    it('should identify conditional exports', () => {
      const conditional = {
        import: './index.mjs',
        require: './index.cjs',
        default: './index.js',
      }
      expect(isConditionalExports(conditional)).toBe(true)
    })

    it('should identify node condition', () => {
      const conditional = {
        node: './node.js',
        browser: './browser.js',
      }
      expect(isConditionalExports(conditional)).toBe(true)
    })

    it('should reject non-conditional exports', () => {
      const nonConditional = {
        '.': './index.js',
        './sub': './sub.js',
      }
      expect(isConditionalExports(nonConditional)).toBe(false)
    })

    it('should handle string values', () => {
      expect(isConditionalExports('./index.js')).toBe(false)
    })

    it('should handle null', () => {
      expect(isConditionalExports(null)).toBe(false)
    })

    it('should handle arrays', () => {
      expect(isConditionalExports(['./index.js'])).toBe(false)
    })
  })

  describe('isSubpathExports', () => {
    it('should identify subpath exports', () => {
      const exports = {
        '.': './index.js',
        './sub': './sub.js',
      }
      expect(isSubpathExports(exports)).toBe(true)
    })

    it('should identify single dot export', () => {
      const exports = {
        '.': './index.js',
      }
      expect(isSubpathExports(exports)).toBe(true)
    })

    it('should reject conditional exports', () => {
      const exports = {
        import: './index.mjs',
        require: './index.cjs',
      }
      expect(isSubpathExports(exports)).toBe(false)
    })

    it('should handle string exports', () => {
      expect(isSubpathExports('./index.js')).toBe(false)
    })

    it('should handle null', () => {
      expect(isSubpathExports(null)).toBe(false)
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
    })

    it('should handle non-object exports', () => {
      const paths = getExportFilePaths('./index.js')
      expect(paths).toEqual([])
    })

    it('should handle nested conditions', () => {
      const exports = {
        '.': {
          node: {
            import: './node.mjs',
            require: './node.cjs',
          },
          default: './browser.js',
        },
      }
      const paths = getExportFilePaths(exports)
      expect(Array.isArray(paths)).toBe(true)
      expect(paths.length).toBeGreaterThan(0)
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
    })
  })
})
