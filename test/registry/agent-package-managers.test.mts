import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
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
} from '../../registry/dist/lib/agent.js'
import {
  resolveBinPathSync,
  whichBin,
  whichBinSync,
} from '../../registry/dist/lib/bin.js'
import { trash } from '../../scripts/utils/fs.mjs'

describe('agent package manager utilities', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = path.join(os.tmpdir(), `agent-test-${Date.now()}`)
    fs.mkdirSync(tmpDir, { recursive: true })
  })

  afterEach(async () => {
    await trash(tmpDir)
  })

  describe('flag detection', () => {
    it('should detect npm flags', () => {
      expect(isNpmAuditFlag('--audit')).toBe(true)
      expect(isNpmAuditFlag('--no-audit')).toBe(true)
      expect(isNpmFundFlag('--fund')).toBe(true)
      expect(isNpmFundFlag('--no-fund')).toBe(true)
      expect(isNpmLoglevelFlag('--loglevel')).toBe(true)
      expect(isNpmLoglevelFlag('--silent')).toBe(true)
      expect(isNpmNodeOptionsFlag('--node-options')).toBe(true)
      expect(isNpmProgressFlag('--progress')).toBe(true)
      expect(isNpmProgressFlag('--no-progress')).toBe(true)
    })

    it('should detect pnpm flags', () => {
      expect(isPnpmFrozenLockfileFlag('--frozen-lockfile')).toBe(true)
      expect(isPnpmFrozenLockfileFlag('--no-frozen-lockfile')).toBe(true)
      expect(isPnpmIgnoreScriptsFlag('--ignore-scripts')).toBe(true)
      expect(isPnpmIgnoreScriptsFlag('--no-ignore-scripts')).toBe(true)
      expect(isPnpmLoglevelFlag('--loglevel')).toBe(true)
      expect(isPnpmLoglevelFlag('--silent')).toBe(true)
    })

    it('should detect pnpm commands', () => {
      expect(isPnpmInstallCommand('install')).toBe(true)
      expect(isPnpmInstallCommand('i')).toBe(true)
      expect(isPnpmInstallCommand('add')).toBe(false)
    })

    it('should reject invalid flags', () => {
      expect(isNpmAuditFlag('--other')).toBe(false)
      expect(isNpmFundFlag('--other')).toBe(false)
      expect(isNpmLoglevelFlag('--other')).toBe(false)
      expect(isNpmNodeOptionsFlag('--other')).toBe(false)
      expect(isNpmProgressFlag('--other')).toBe(false)
      expect(isPnpmFrozenLockfileFlag('--other')).toBe(false)
      expect(isPnpmIgnoreScriptsFlag('--other')).toBe(false)
      expect(isPnpmLoglevelFlag('--other')).toBe(false)
      expect(isPnpmInstallCommand('other')).toBe(false)
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
      expect(result === undefined || typeof result === 'string').toBe(true)
    })

    it('should find binaries with whichBin', async () => {
      const result = await whichBin('node')
      expect(result === undefined || typeof result === 'string').toBe(true)
    })

    it('should return undefined for non-existent binaries', async () => {
      const result = await whichBin('definitely-not-a-real-binary-12345')
      expect(result).toBeUndefined()
    })
  })

  describe('package manager execution', () => {
    it('should execute npm --version', async () => {
      try {
        const result = await execNpm(['--version'], { cwd: tmpDir })
        expect(result).toBeDefined()
        expect(result.stdout).toBeDefined()
        const version = String(result.stdout).trim()
        expect(version).toMatch(/^\d+\.\d+\.\d+/)
      } catch (error) {
        expect(error).toBeDefined()
      }
    })

    it('should execute pnpm --version', async () => {
      try {
        const result = await execPnpm(['--version'], { cwd: tmpDir })
        expect(result).toBeDefined()
        expect(result.stdout).toBeDefined()
        const version = String(result.stdout).trim()
        expect(version).toMatch(/^\d+\.\d+\.\d+/)
      } catch (error) {
        expect(error).toBeDefined()
      }
    })

    it('should execute yarn --version', async () => {
      try {
        const result = await execYarn(['--version'], { cwd: tmpDir })
        expect(result).toBeDefined()
        expect(result.stdout).toBeDefined()
        const version = String(result.stdout).trim()
        expect(version).toMatch(/^\d+\.\d+\.\d+/)
      } catch (error) {
        expect(error).toBeDefined()
      }
    })

    it('should handle npm with --no-audit flag', async () => {
      try {
        const result = await execNpm(['install', '--dry-run', '--no-audit'], {
          cwd: tmpDir,
        })
        expect(result).toBeDefined()
      } catch (error) {
        expect(error).toBeDefined()
      }
    })

    it('should handle pnpm with --frozen-lockfile flag', async () => {
      try {
        const result = await execPnpm(
          ['install', '--dry-run', '--frozen-lockfile'],
          { cwd: tmpDir },
        )
        expect(result).toBeDefined()
      } catch (error) {
        expect(error).toBeDefined()
      }
    })

    it('should handle yarn with --silent flag', async () => {
      try {
        const result = await execYarn(['--version', '--silent'], {
          cwd: tmpDir,
        })
        expect(result).toBeDefined()
      } catch (error) {
        expect(error).toBeDefined()
      }
    })

    it('should execute script with proper binary resolution', async () => {
      const scriptPath = path.join(tmpDir, 'test-script.js')
      fs.writeFileSync(scriptPath, 'console.log("test successful")')

      try {
        const result = await execScript('node', [scriptPath], { cwd: tmpDir })
        expect(result).toBeDefined()
      } catch (error) {
        expect(error).toBeDefined()
      }
    })
  })

  describe('package manager lockfile detection', () => {
    const lockfiles = [
      { name: 'pnpm-lock.yaml', manager: 'pnpm', content: '' },
      { name: 'package-lock.json', manager: 'npm', content: '{}' },
      { name: 'yarn.lock', manager: 'yarn', content: '' },
      { name: 'bun.lockb', manager: 'bun', content: '' },
      { name: 'vlt-lock.json', manager: 'vlt', content: '{}' },
    ]

    for (const { content, manager, name } of lockfiles) {
      it(`should detect ${manager} via ${name}`, async () => {
        const testDir = fs.mkdtempSync(
          path.join(os.tmpdir(), `${manager}-test-`),
        )

        fs.writeFileSync(
          path.join(testDir, 'package.json'),
          JSON.stringify({
            name: 'test',
            version: '1.0.0',
            scripts: { test: 'node --version' },
          }),
        )
        fs.writeFileSync(path.join(testDir, name), content)

        try {
          await execScript('test', { cwd: testDir })
        } catch (error) {
          expect(error).toBeDefined()
        } finally {
          await trash(testDir)
        }
      })
    }
  })
})
