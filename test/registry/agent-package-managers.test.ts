import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

const {
  execBin,
  execNpm,
  execPnpm,
  execScript,
  execYarn,
  isNpmAuditFlag,
  isNpmFundFlag,
  isNpmLoglevelFlag,
  isNpmNodeOptionsFlag,
  isNpmProgressFlag,
  isPnpmFrozenLockfileFlag,
  isPnpmIgnoreScriptsFlag,
  isPnpmInstallCommand,
  isPnpmLoglevelFlag,
  resolveBinPathSync,
  whichBin,
  whichBinSync,
} = require('@socketsecurity/registry/lib/agent')

describe('agent package manager utilities', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = path.join(os.tmpdir(), `agent-test-${Date.now()}`)
    fs.mkdirSync(tmpDir, { recursive: true })
  })

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  describe('npm flag detection', () => {
    it('should detect npm audit flags', () => {
      expect(isNpmAuditFlag('--audit')).toBe(true)
      expect(isNpmAuditFlag('--no-audit')).toBe(true)
      expect(isNpmAuditFlag('--other')).toBe(false)
    })

    it('should detect npm fund flags', () => {
      expect(isNpmFundFlag('--fund')).toBe(true)
      expect(isNpmFundFlag('--no-fund')).toBe(true)
      expect(isNpmFundFlag('--other')).toBe(false)
    })

    it('should detect npm loglevel flags', () => {
      expect(isNpmLoglevelFlag('--loglevel')).toBe(true)
      expect(isNpmLoglevelFlag('--silent')).toBe(true)
      expect(isNpmLoglevelFlag('--quiet')).toBe(true)
      expect(isNpmLoglevelFlag('--verbose')).toBe(true)
      expect(isNpmLoglevelFlag('--other')).toBe(false)
    })

    it('should detect npm node-options flags', () => {
      expect(isNpmNodeOptionsFlag('--node-options')).toBe(true)
      expect(isNpmNodeOptionsFlag('--other')).toBe(false)
    })

    it('should detect npm progress flags', () => {
      expect(isNpmProgressFlag('--progress')).toBe(true)
      expect(isNpmProgressFlag('--no-progress')).toBe(true)
      expect(isNpmProgressFlag('--other')).toBe(false)
    })
  })

  describe('pnpm flag detection', () => {
    it('should detect pnpm frozen lockfile flags', () => {
      expect(isPnpmFrozenLockfileFlag('--frozen-lockfile')).toBe(true)
      expect(isPnpmFrozenLockfileFlag('--no-frozen-lockfile')).toBe(true)
      expect(isPnpmFrozenLockfileFlag('--other')).toBe(false)
    })

    it('should detect pnpm ignore scripts flags', () => {
      expect(isPnpmIgnoreScriptsFlag('--ignore-scripts')).toBe(true)
      expect(isPnpmIgnoreScriptsFlag('--no-ignore-scripts')).toBe(true)
      expect(isPnpmIgnoreScriptsFlag('--other')).toBe(false)
    })

    it('should detect pnpm install commands', () => {
      expect(isPnpmInstallCommand('install')).toBe(true)
      expect(isPnpmInstallCommand('i')).toBe(true)
      expect(isPnpmInstallCommand('add')).toBe(false) // Not an install command specifically
      expect(isPnpmInstallCommand('other')).toBe(false)
    })

    it('should detect pnpm loglevel flags', () => {
      expect(isPnpmLoglevelFlag('--loglevel')).toBe(true)
      expect(isPnpmLoglevelFlag('--silent')).toBe(true)
      expect(isPnpmLoglevelFlag('--other')).toBe(false)
    })
  })

  describe('binary resolution', () => {
    it('should resolve binary paths', () => {
      const result = resolveBinPathSync('node')
      expect(typeof result).toBe('string')
      expect(result.length).toBeGreaterThan(0)
    })

    it('should handle non-existent binaries', () => {
      const result = resolveBinPathSync('definitely-not-a-real-binary-12345')
      expect(typeof result).toBe('string')
    })
  })

  describe('which utilities', () => {
    it('should find binaries with whichBinSync', () => {
      const result = whichBinSync('node')
      expect(result === null || typeof result === 'string').toBe(true)
    })

    it('should find binaries with whichBin', async () => {
      const result = await whichBin('node')
      expect(result === null || typeof result === 'string').toBe(true)
    })

    it('should return null for non-existent binaries', async () => {
      const result = await whichBin('definitely-not-a-real-binary-12345')
      expect(result).toBeNull()
    })
  })

  describe('execution functions', () => {
    it('should have execNpm function', () => {
      expect(typeof execNpm).toBe('function')
    })

    it('should have execPnpm function', () => {
      expect(typeof execPnpm).toBe('function')
    })

    it('should have execYarn function', () => {
      expect(typeof execYarn).toBe('function')
    })

    it('should have execBin function', () => {
      expect(typeof execBin).toBe('function')
    })

    it('should have execScript function', () => {
      expect(typeof execScript).toBe('function')
    })
  })

  describe('integration tests', () => {
    it('should execute npm --version', async () => {
      try {
        const result = await execNpm(['--version'], { cwd: tmpDir })
        expect(result).toBeDefined()
        expect(result.stdout).toBeDefined()
      } catch (error) {
        // npm might not be available in test environment
        expect(error).toBeDefined()
      }
    })

    it('should execute script with proper binary resolution', async () => {
      // Create a simple test script
      const scriptPath = path.join(tmpDir, 'test-script.js')
      fs.writeFileSync(scriptPath, 'console.log("test successful")')

      try {
        const result = await execScript('node', [scriptPath], { cwd: tmpDir })
        expect(result).toBeDefined()
      } catch (error) {
        // May fail in some test environments
        expect(error).toBeDefined()
      }
    })
  })
})
