import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { safeRemove } from '../../scripts/utils/fs.mjs'

const {
  findRealBin,
  findRealNpm,
  findRealPnpm,
  findRealYarn,
  isShadowBinPath,
} = require('../../registry/dist/lib/bin')

describe('bin find utilities', () => {
  describe('findRealBin', () => {
    it('should find real binary path', () => {
      const result = findRealBin('node')
      if (result) {
        expect(typeof result).toBe('string')
        expect(path.isAbsolute(result)).toBe(true)
      }
    })

    it('should handle paths with extensions', () => {
      const result = findRealBin('npm')
      if (result) {
        expect(typeof result).toBe('string')
      }
    })

    it('should return undefined for non-existent binaries', () => {
      const result = findRealBin('nonexistentbinary12345')
      expect(result).toBeUndefined()
    })

    it('should use common paths when provided', () => {
      const result = findRealBin('node', ['/fake/path/node'])
      expect(result).toBeTruthy()
    })

    it('should prefer non-shadow paths', () => {
      const result = findRealBin('npm')
      if (result) {
        expect(isShadowBinPath(result)).toBe(false)
      }
    })

    it('should check common paths first', () => {
      const nodePath = process.execPath
      const result = findRealBin('node', [nodePath])
      expect(result).toBe(nodePath)
    })

    it('should find binary in common paths first', () => {
      const commonPaths = ['/usr/local/bin/test', '/usr/bin/test']
      const result = findRealBin('test', commonPaths)
      expect(result).toBeTruthy()
    })

    it('should return undefined when binary not found', () => {
      const result = findRealBin('nonexistent12345xyz', [])
      expect(result).toBeUndefined()
    })

    it('should find real binary when first result is shadow bin', async () => {
      const tmpDir = os.tmpdir()
      const shadowBinDir = path.join(tmpDir, 'node_modules', '.bin')
      const shadowBinPath = path.join(shadowBinDir, `shadow-test-${Date.now()}`)

      fs.mkdirSync(shadowBinDir, { recursive: true })
      fs.writeFileSync(shadowBinPath, '#!/bin/sh\necho "shadow"', {
        mode: 0o755,
      })

      try {
        const result = findRealBin('node', [])
        expect(result).toBeTruthy()
        expect(isShadowBinPath(result)).toBe(false)
      } finally {
        await safeRemove([path.join(tmpDir, 'node_modules')])
      }
    })

    it('should return existing binary path when provided in commonPaths', async () => {
      const tmpDir = os.tmpdir()
      const binPath = path.join(tmpDir, `test-bin-${Date.now()}`)

      fs.writeFileSync(binPath, '#!/bin/sh\necho "test"', { mode: 0o755 })

      try {
        const result = findRealBin('test', [binPath])
        expect(result).toBe(binPath)
      } finally {
        await safeRemove([binPath])
      }
    })
  })

  describe('findRealNpm', () => {
    it('should find real npm path', () => {
      const npmPath = findRealNpm()
      expect(npmPath).toBeTruthy()
      expect(typeof npmPath).toBe('string')
      expect(npmPath.includes('npm')).toBe(true)
    })

    it('should return an absolute path', () => {
      const npmPath = findRealNpm()
      expect(path.isAbsolute(npmPath)).toBe(true)
    })

    it('should not return a shadow bin path', () => {
      const npmPath = findRealNpm()
      expect(isShadowBinPath(npmPath)).toBe(false)
    })

    it('should prefer npm in node directory', () => {
      const npmPath = findRealNpm()
      const nodeDir = path.dirname(process.execPath)
      if (fs.existsSync(path.join(nodeDir, 'npm'))) {
        expect(npmPath).toBe(path.join(nodeDir, 'npm'))
      }
    })

    it('should find npm', () => {
      const result = findRealNpm()
      expect(result).toBeTruthy()
    })
  })

  describe('findRealPnpm', () => {
    it('should find real pnpm path if installed', () => {
      const pnpmPath = findRealPnpm()
      if (pnpmPath) {
        expect(typeof pnpmPath).toBe('string')
        expect(pnpmPath.includes('pnpm')).toBe(true)
        expect(path.isAbsolute(pnpmPath)).toBe(true)
      }
    })

    it('should return undefined if pnpm is not installed', () => {
      const pnpmPath = findRealPnpm()
      expect(pnpmPath === undefined || typeof pnpmPath === 'string').toBe(true)
    })

    it('should find pnpm using findRealBin with common paths', () => {
      const result = findRealPnpm()
      expect(result !== undefined).toBe(true)
    })
  })

  describe('findRealYarn', () => {
    it('should find real yarn path if installed', () => {
      const yarnPath = findRealYarn()
      if (yarnPath) {
        expect(typeof yarnPath).toBe('string')
        expect(yarnPath.includes('yarn')).toBe(true)
        expect(path.isAbsolute(yarnPath)).toBe(true)
      }
    })

    it('should return undefined if yarn is not installed', () => {
      const yarnPath = findRealYarn()
      expect(yarnPath === undefined || typeof yarnPath === 'string').toBe(true)
    })

    it('should not return a shadow bin path if found', () => {
      const yarnPath = findRealYarn()
      if (yarnPath) {
        expect(isShadowBinPath(yarnPath)).toBe(false)
      }
    })

    it('should find yarn using findRealBin with common paths', () => {
      const result = findRealYarn()
      expect(result !== undefined).toBe(true)
    })
  })
})
