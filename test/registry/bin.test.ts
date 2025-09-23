import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import trash from 'trash'
import { describe, expect, it } from 'vitest'

const {
  execBin,
  findRealBin,
  findRealNpm,
  findRealPnpm,
  findRealYarn,
  isShadowBinPath,
  resolveBinPathSync,
  whichBin,
  whichBinSync,
} = require('@socketsecurity/registry/lib/bin')

describe('bin module', () => {
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
  })

  describe('resolveBinPathSync', () => {
    it('should resolve real bin paths', () => {
      const npmPath = resolveBinPathSync('npm')
      expect(npmPath).toBeTruthy()
      expect(typeof npmPath).toBe('string')
    })

    it('should return the same path for non-links', () => {
      // Use process.execPath which exists on all platforms.
      const regularPath = process.execPath
      const resolved = resolveBinPathSync(regularPath)
      expect(resolved).toBeTruthy()
      expect(resolved).toBe(regularPath)
    })

    it('should handle non-existent paths', () => {
      // resolveBinPathSync returns the path when it doesn't exist.
      // Create a proper absolute path that works on all platforms.
      // Use tmpdir's root as base to ensure we get a fully qualified path.
      const tmpRoot = path.parse(os.tmpdir()).root
      const nonExistentPath = path.join(tmpRoot, 'non', 'existent', 'binary')
      const result = resolveBinPathSync(nonExistentPath)
      expect(result).toBe(nonExistentPath)
    })

    it('should handle paths where a file is used as a directory', async () => {
      // When a component in the path exists but is not a directory,
      // resolveBinPathSync returns the path (letting spawn handle the error).
      // Create a temporary file.
      const tmpFile = path.join(os.tmpdir(), `test-file-${Date.now()}.txt`)
      fs.writeFileSync(tmpFile, 'test')

      try {
        // Try to use the file as a directory.
        const invalidPath = path.join(tmpFile, 'somebinary')
        const result = resolveBinPathSync(invalidPath)
        expect(result).toBe(invalidPath)
      } finally {
        // Clean up.
        await trash(tmpFile)
      }
    })
  })

  describe('whichBinSync', () => {
    it('should find binary in PATH synchronously', () => {
      const nodePath = whichBinSync('node')
      expect(nodePath).toBeTruthy()
      expect(typeof nodePath).toBe('string')
      expect(path.isAbsolute(nodePath)).toBe(true)
    })

    it('should return null for non-existent binaries', () => {
      const result = whichBinSync('nonexistentbinary12345')
      expect(result).toBeNull()
    })

    it('should handle options', () => {
      const result = whichBinSync('node', { all: false })
      expect(result === null || typeof result === 'string').toBe(true)
    })
  })

  describe('whichBin', () => {
    it('should find binary in PATH asynchronously', async () => {
      const nodePath = await whichBin('node')
      expect(nodePath).toBeTruthy()
      expect(typeof nodePath).toBe('string')
      expect(path.isAbsolute(nodePath)).toBe(true)
    })

    it('should return null for non-existent binaries', async () => {
      const result = await whichBin('nonexistentbinary12345')
      expect(result).toBeNull()
    })

    it('should handle options', async () => {
      const result = await whichBin('node', { all: false })
      expect(result === null || typeof result === 'string').toBe(true)
    })
  })

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

    it('should return null for non-existent binaries', () => {
      const result = findRealBin('nonexistentbinary12345')
      expect(result).toBeNull()
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
  })

  describe('execBin', () => {
    it('should execute binary commands', async () => {
      const result = await execBin('echo', ['hello'])
      expect(result).toBeDefined()
      expect(result.stdout).toContain('hello')
    })

    it('should handle command with options', async () => {
      const result = await execBin('node', ['-e', 'console.log("test")'])
      expect(result.stdout).toContain('test')
    })

    it('should throw for non-existent commands', async () => {
      try {
        await execBin('nonexistentcommand12345', [])
        expect.fail('Should have thrown')
      } catch (error) {
        expect(error).toBeDefined()
      }
    })

    it('should support environment variables', async () => {
      const result = await execBin(
        'node',
        ['-e', 'console.log(process.env.TEST_VAR)'],
        {
          env: { ...process.env, TEST_VAR: 'test_value' },
        },
      )
      expect(result.stdout).toContain('test_value')
    })

    it('should support working directory', async () => {
      const tmpDir = os.tmpdir()
      const result = await execBin(
        'node',
        ['-e', 'console.log(process.cwd())'],
        {
          cwd: tmpDir,
        },
      )
      expect(result.stdout).toContain(tmpDir)
    })
  })
})
