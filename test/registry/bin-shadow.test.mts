import { describe, expect, it } from 'vitest'

const { isShadowBinPath } = require('@socketsecurity/registry/lib/bin')

describe('bin shadow path detection', () => {
  describe('isShadowBinPath', () => {
    it('should identify shadow bin paths', () => {
      expect(isShadowBinPath('/usr/local/bin/npx')).toBe(false)
      expect(isShadowBinPath('/node_modules/.bin/something')).toBe(true)
      expect(isShadowBinPath('node_modules/.bin/tool')).toBe(true)
    })

    it('should handle Windows paths', () => {
      expect(isShadowBinPath('C:\\project\\node_modules\\.bin\\tool.cmd')).toBe(
        true,
      )
      expect(isShadowBinPath('C:\\Program Files\\nodejs\\npm.cmd')).toBe(false)
    })

    it('should handle edge cases', () => {
      expect(isShadowBinPath('')).toBe(false)
      expect(isShadowBinPath('/')).toBe(false)
      expect(isShadowBinPath('node_modules')).toBe(false)
    })

    it('should handle various path formats', () => {
      const shadowPaths = [
        'node_modules/.bin/tool',
        './node_modules/.bin/tool',
        '../node_modules/.bin/tool',
        'some/path/node_modules/.bin/tool',
      ]

      shadowPaths.forEach((p: string) => {
        expect(isShadowBinPath(p)).toBe(true)
      })
    })

    it('should handle paths that look similar but are not shadow bins', () => {
      const notShadowPaths = [
        // No .bin directory.
        'node_modules/package/bin/tool',
        // Just .bin without node_modules.
        '.bin/tool',
        // No .bin at all.
        'some_node_modules_dir/tool',
      ]

      notShadowPaths.forEach((p: string) => {
        expect(isShadowBinPath(p)).toBe(false)
      })

      // These ARE shadow bin paths (contain 'node_modules/.bin').
      const shadowPaths = [
        'my_node_modules/.bin/tool',
        'node_modules_backup/node_modules/.bin/tool',
      ]
      shadowPaths.forEach((p: string) => {
        expect(isShadowBinPath(p)).toBe(true)
      })
    })

    it('should handle empty or null paths', () => {
      expect(isShadowBinPath('')).toBe(false)
      expect(isShadowBinPath(null)).toBe(false)
      expect(isShadowBinPath(undefined)).toBe(false)
    })
  })
})
