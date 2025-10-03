import { describe, expect, it } from 'vitest'

import bunCachePath from '../../registry/dist/lib/constants/bun-cache-path.js'
import npmExecPath from '../../registry/dist/lib/constants/npm-exec-path.js'
import pacoteCachePath from '../../registry/dist/lib/constants/pacote-cache-path.js'
import pnpmExecPath from '../../registry/dist/lib/constants/pnpm-exec-path.js'
import pnpmStorePath from '../../registry/dist/lib/constants/pnpm-store-path.js'
import vltCachePath from '../../registry/dist/lib/constants/vlt-cache-path.js'
import yarnCachePath from '../../registry/dist/lib/constants/yarn-cache-path.js'
import yarnExecPath from '../../registry/dist/lib/constants/yarn-exec-path.js'

describe('package manager path constants', () => {
  describe('cache paths', () => {
    it('should export bunCachePath', () => {
      expect(typeof bunCachePath).toBe('string')
    })

    it('should export pacoteCachePath', () => {
      expect(typeof pacoteCachePath).toBe('string')
    })

    it('should export pnpmStorePath', () => {
      expect(typeof pnpmStorePath).toBe('string')
    })

    it('should export vltCachePath', () => {
      expect(typeof vltCachePath).toBe('string')
    })

    it('should export yarnCachePath', () => {
      expect(typeof yarnCachePath).toBe('string')
    })
  })

  describe('executable paths', () => {
    it('should export npmExecPath', () => {
      expect(typeof npmExecPath).toBe('string')
      expect(npmExecPath.length).toBeGreaterThan(0)
    })

    it('should export pnpmExecPath', () => {
      expect(typeof pnpmExecPath).toBe('string')
    })

    it('should export yarnExecPath', () => {
      expect(typeof yarnExecPath).toBe('string')
    })
  })
})
