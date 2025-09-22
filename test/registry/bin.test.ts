import path from 'node:path'

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
  whichBinSync
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
        true
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
      const regularPath = '/usr/bin/node'
      const resolved = resolveBinPathSync(regularPath)
      expect(resolved).toBeTruthy()
    })

    it('should handle non-existent paths', () => {
      const result = resolveBinPathSync('/non/existent/binary')
      expect(result).toBeTruthy() // Returns the path even if it doesn't exist
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
          env: { ...process.env, TEST_VAR: 'test_value' }
        }
      )
      expect(result.stdout).toContain('test_value')
    })

    it('should support working directory', async () => {
      const result = await execBin(
        'node',
        ['-e', 'console.log(process.cwd())'],
        {
          cwd: '/tmp'
        }
      )
      expect(result.stdout).toContain('/tmp')
    })
  })
})
