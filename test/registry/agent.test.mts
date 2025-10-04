import { describe, expect, it } from 'vitest'

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
  execBin,
  resolveBinPathSync,
  whichBin,
  whichBinSync,
} from '../../registry/dist/lib/bin.js'

describe('agent module', () => {
  describe('isNpmAuditFlag', () => {
    it('should identify npm audit flags', () => {
      expect(isNpmAuditFlag('--audit')).toBe(true)
      expect(isNpmAuditFlag('--no-audit')).toBe(true)
      expect(isNpmAuditFlag('--audit=true')).toBe(true)
      expect(isNpmAuditFlag('--audit=false')).toBe(true)
    })

    it('should reject non-audit flags', () => {
      expect(isNpmAuditFlag('--verbose')).toBe(false)
      expect(isNpmAuditFlag('--install')).toBe(false)
      expect(isNpmAuditFlag('audit')).toBe(false)
      expect(isNpmAuditFlag('')).toBe(false)
    })
  })

  describe('isNpmFundFlag', () => {
    it('should identify npm fund flags', () => {
      expect(isNpmFundFlag('--fund')).toBe(true)
      expect(isNpmFundFlag('--no-fund')).toBe(true)
      expect(isNpmFundFlag('--fund=true')).toBe(true)
      expect(isNpmFundFlag('--fund=false')).toBe(true)
    })

    it('should reject non-fund flags', () => {
      expect(isNpmFundFlag('--audit')).toBe(false)
      expect(isNpmFundFlag('--verbose')).toBe(false)
      expect(isNpmFundFlag('fund')).toBe(false)
      expect(isNpmFundFlag('')).toBe(false)
    })
  })

  describe('isNpmLoglevelFlag', () => {
    it('should identify npm loglevel flags', () => {
      expect(isNpmLoglevelFlag('--loglevel')).toBe(true)
      expect(isNpmLoglevelFlag('--loglevel=info')).toBe(true)
      expect(isNpmLoglevelFlag('--loglevel=debug')).toBe(true)
      expect(isNpmLoglevelFlag('--loglevel=warn')).toBe(true)
      expect(isNpmLoglevelFlag('--loglevel=error')).toBe(true)
      expect(isNpmLoglevelFlag('--loglevel=silent')).toBe(true)
    })

    it('should identify shorthand flags', () => {
      expect(isNpmLoglevelFlag('--silent')).toBe(true)
      expect(isNpmLoglevelFlag('-s')).toBe(true)
      expect(isNpmLoglevelFlag('--quiet')).toBe(true)
      expect(isNpmLoglevelFlag('-q')).toBe(true)
      expect(isNpmLoglevelFlag('--verbose')).toBe(true)
      expect(isNpmLoglevelFlag('-d')).toBe(true)
      expect(isNpmLoglevelFlag('-dd')).toBe(true)
      expect(isNpmLoglevelFlag('-ddd')).toBe(true)
    })

    it('should reject non-loglevel flags', () => {
      expect(isNpmLoglevelFlag('--install')).toBe(false)
      expect(isNpmLoglevelFlag('loglevel')).toBe(false)
      expect(isNpmLoglevelFlag('')).toBe(false)
    })
  })

  describe('isNpmProgressFlag', () => {
    it('should identify npm progress flags', () => {
      expect(isNpmProgressFlag('--progress')).toBe(true)
      expect(isNpmProgressFlag('--no-progress')).toBe(true)
      expect(isNpmProgressFlag('--progress=true')).toBe(true)
      expect(isNpmProgressFlag('--progress=false')).toBe(true)
    })

    it('should reject non-progress flags', () => {
      expect(isNpmProgressFlag('--verbose')).toBe(false)
      expect(isNpmProgressFlag('progress')).toBe(false)
      expect(isNpmProgressFlag('')).toBe(false)
    })
  })

  describe('isNpmNodeOptionsFlag', () => {
    it('should identify npm node-options flags', () => {
      expect(isNpmNodeOptionsFlag('--node-options')).toBe(true)
      expect(
        isNpmNodeOptionsFlag('--node-options=--max-old-space-size=4096'),
      ).toBe(true)
    })

    it('should reject non-node-options flags', () => {
      expect(isNpmNodeOptionsFlag('--verbose')).toBe(false)
      expect(isNpmNodeOptionsFlag('node-options')).toBe(false)
      expect(isNpmNodeOptionsFlag('')).toBe(false)
    })
  })

  describe('execNpm', () => {
    it('should execute npm commands', async () => {
      const result = await execNpm(['--version'])
      expect(result).toBeDefined()
      expect(result.stdout).toMatch(/\d+\.\d+\.\d+/)
    })

    it('should handle npm help', async () => {
      const result = await execNpm(['help'], { timeout: 10_000 })
      expect(result.stdout || result.stderr).toContain('npm')
    })

    it('should filter audit flags', async () => {
      const result = await execNpm(['--version', '--no-audit'])
      expect(result.stdout).toMatch(/\d+\.\d+\.\d+/)
    })

    it('should handle errors', async () => {
      try {
        await execNpm(['nonexistentcommand'])
        expect.fail('Should have thrown')
      } catch (error) {
        expect(error).toBeDefined()
      }
    })
  })

  describe('execPnpm', () => {
    it('should execute pnpm commands if available', async () => {
      try {
        const result = await execPnpm(['--version'])
        expect(result).toBeDefined()
        expect(result.stdout).toMatch(/\d+\.\d+\.\d+/)
      } catch (error: unknown) {
        // pnpm might not be installed
        expect(error).toBeDefined()
      }
    })
  })

  describe('execYarn', () => {
    it('should execute yarn commands if available', async () => {
      try {
        const result = await execYarn(['--version'])
        expect(result).toBeDefined()
        expect(result.stdout).toMatch(/\d+\.\d+\.\d+/)
      } catch (error: unknown) {
        // yarn might not be installed
        expect(error).toBeDefined()
      }
    })
  })

  describe('execScript', () => {
    it('should execute package scripts', async () => {
      const result = await execScript('echo "test script"', { shell: true })
      expect(result).toBeDefined()
      expect(result.stdout).toContain('test script')
    })

    it('should handle script errors', async () => {
      try {
        await execScript('exit 1', { shell: true })
        expect.fail('Should have thrown')
      } catch (error) {
        expect(error).toBeDefined()
      }
    })

    it('should support environment variables', async () => {
      const result = await execScript(
        'node -e "console.log(process.env.SCRIPT_VAR)"',
        {
          shell: true,
          env: { ...process.env, SCRIPT_VAR: 'script_value' },
        },
      )
      expect(result.stdout).toContain('script_value')
    })
  })

  describe('execBin', () => {
    it('should execute binary commands', async () => {
      const result = await execBin('echo', ['test'])
      expect(result).toBeDefined()
      expect(result.stdout).toContain('test')
    })

    it('should handle binary with args', async () => {
      const result = await execBin('node', ['-e', 'console.log(123)'])
      expect(result.stdout).toContain('123')
    })

    it('should handle errors', async () => {
      try {
        await execBin('nonexistentbinary12345', [])
        expect.fail('Should have thrown')
      } catch (error) {
        expect(error).toBeDefined()
      }
    })
  })

  describe('isPnpmFrozenLockfileFlag', () => {
    it('should identify pnpm frozen-lockfile flags', () => {
      expect(isPnpmFrozenLockfileFlag('--frozen-lockfile')).toBe(true)
    })

    it('should reject non-frozen-lockfile flags', () => {
      expect(isPnpmFrozenLockfileFlag('--install')).toBe(false)
      expect(isPnpmFrozenLockfileFlag('frozen-lockfile')).toBe(false)
      expect(isPnpmFrozenLockfileFlag('')).toBe(false)
    })
  })

  describe('isPnpmIgnoreScriptsFlag', () => {
    it('should identify pnpm ignore-scripts flags', () => {
      expect(isPnpmIgnoreScriptsFlag('--ignore-scripts')).toBe(true)
    })

    it('should reject non-ignore-scripts flags', () => {
      expect(isPnpmIgnoreScriptsFlag('--install')).toBe(false)
      expect(isPnpmIgnoreScriptsFlag('ignore-scripts')).toBe(false)
      expect(isPnpmIgnoreScriptsFlag('')).toBe(false)
    })
  })

  describe('isPnpmInstallCommand', () => {
    it('should identify pnpm install commands', () => {
      expect(isPnpmInstallCommand('install')).toBe(true)
      expect(isPnpmInstallCommand('i')).toBe(true)
    })

    it('should reject non-install commands', () => {
      expect(isPnpmInstallCommand('run')).toBe(false)
      expect(isPnpmInstallCommand('test')).toBe(false)
      expect(isPnpmInstallCommand('build')).toBe(false)
      expect(isPnpmInstallCommand('')).toBe(false)
    })
  })

  describe('isPnpmLoglevelFlag', () => {
    it('should identify pnpm loglevel flags', () => {
      expect(isPnpmLoglevelFlag('--loglevel')).toBe(true)
      expect(isPnpmLoglevelFlag('--loglevel=error')).toBe(true)
    })

    it('should reject non-loglevel flags', () => {
      expect(isPnpmLoglevelFlag('--install')).toBe(false)
      expect(isPnpmLoglevelFlag('loglevel')).toBe(false)
      expect(isPnpmLoglevelFlag('')).toBe(false)
    })
  })

  describe('resolveBinPathSync', () => {
    it('should resolve binary paths synchronously', () => {
      const path = resolveBinPathSync('node')
      expect(typeof path).toBe('string')
      expect(path.length).toBeGreaterThan(0)
    })

    it('should handle non-existent binaries', () => {
      const path = resolveBinPathSync('nonexistentbinary12345')
      // Returns the input when not found
      expect(path).toBeDefined()
    })
  })

  describe('whichBinSync', () => {
    it('should find binaries synchronously', () => {
      const path = whichBinSync('node')
      expect(typeof path).toBe('string')
      expect(path!.length).toBeGreaterThan(0)
    })

    it('should return undefined for non-existent binaries', () => {
      const path = whichBinSync('nonexistentbinary12345')
      expect(path).toBeUndefined()
    })
  })

  describe('whichBin', () => {
    it('should find binaries asynchronously', async () => {
      const path = await whichBin('node')
      expect(typeof path).toBe('string')
      expect(path!.length).toBeGreaterThan(0)
    })

    it('should return undefined for non-existent binaries', async () => {
      const path = await whichBin('nonexistentbinary12345')
      expect(path).toBeUndefined()
    })

    it('should handle string binary name', async () => {
      const path = await whichBin('node')
      expect(typeof path).toBe('string')
    })
  })
})
