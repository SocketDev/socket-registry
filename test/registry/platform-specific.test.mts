import os from 'node:os'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  findRealBin,
  findRealNpm,
  findRealPnpm,
  findRealYarn,
  isShadowBinPath,
} from '../../registry/dist/lib/bin.js'
import {
  normalizePackageJson,
  readPackageJsonSync,
} from '../../registry/dist/lib/packages.js'
import { normalizePath } from '../../registry/dist/lib/path.js'

const isWindows = process.platform === 'win32'

describe('platform-specific tests', () => {
  describe('bin paths - platform specific', () => {
    it('should find npm on current platform', () => {
      const npmPath = findRealNpm()
      expect(typeof npmPath).toBe('string')
      expect(npmPath.length).toBeGreaterThan(0)
      if (isWindows) {
        expect(npmPath.toLowerCase()).toMatch(/npm\.cmd|npm\.exe|npm/)
      } else {
        expect(npmPath).toContain('npm')
      }
    })

    it('should find pnpm on current platform if installed', () => {
      const pnpmPath = findRealPnpm()
      if (pnpmPath) {
        expect(typeof pnpmPath).toBe('string')
        if (isWindows) {
          expect(pnpmPath.toLowerCase()).toMatch(/pnpm\.cmd|pnpm\.exe|pnpm/)
        } else {
          expect(pnpmPath).toContain('pnpm')
        }
      }
    })

    it('should find yarn on current platform if installed', () => {
      const yarnPath = findRealYarn()
      if (yarnPath) {
        expect(typeof yarnPath).toBe('string')
        if (isWindows) {
          expect(yarnPath.toLowerCase()).toMatch(/yarn\.cmd|yarn\.exe|yarn/)
        } else {
          expect(yarnPath).toContain('yarn')
        }
      }
    })

    it('should detect shadow bin paths on current platform', () => {
      if (isWindows) {
        expect(isShadowBinPath('C:\\project\\node_modules\\.bin')).toBe(true)
        expect(isShadowBinPath('C:\\Program Files\\nodejs')).toBe(false)
      } else {
        expect(isShadowBinPath('/project/node_modules/.bin')).toBe(true)
        expect(isShadowBinPath('/usr/local/bin')).toBe(false)
      }
    })

    it('should find real bin with platform-specific paths', () => {
      const nodePath = findRealBin('node')
      expect(typeof nodePath).toBe('string')
      if (isWindows) {
        expect(nodePath).toMatch(/node\.exe|node/)
      } else {
        expect(nodePath).toContain('node')
      }
    })
  })

  describe('path normalization - platform specific', () => {
    it('should normalize paths on current platform', () => {
      if (isWindows) {
        expect(normalizePath('C:\\Users\\test\\file.txt')).toBe(
          'C:/Users/test/file.txt',
        )
        expect(normalizePath('C:\\\\Users\\\\test')).toBe('C:/Users/test')
      } else {
        expect(normalizePath('/Users/test/file.txt')).toBe(
          '/Users/test/file.txt',
        )
        expect(normalizePath('/home//user//file')).toBe('/home/user/file')
      }
    })

    it('should handle UNC paths on Windows', () => {
      if (isWindows) {
        const uncPath = '\\\\server\\share\\file.txt'
        const result = normalizePath(uncPath)
        expect(result).toContain('server')
        expect(result).toContain('share')
      }
    })

    it('should handle platform-specific separators', () => {
      const testPath = isWindows ? 'C:\\test\\path' : '/test/path'
      const result = normalizePath(testPath)
      expect(result).toContain('test')
      expect(result).toContain('path')
    })
  })

  describe('package.json reading - platform specific', () => {
    it('should read package.json with platform-specific paths', () => {
      const pkgPath = path.join(process.cwd(), 'package.json')
      const result = readPackageJsonSync(pkgPath)
      expect(result).toBeDefined()
      expect(result!.name).toBeDefined()
    })

    it('should handle package.json normalization on current platform', () => {
      const pkg = {
        name: 'test-package',
        version: '1.0.0',
        bin: isWindows ? { test: '.\\bin\\test.cmd' } : { test: './bin/test' },
      }
      const result = normalizePackageJson(pkg)
      expect(result).toBeDefined()
      expect(result.name).toBe('test-package')
    })
  })

  describe('system paths - platform specific', () => {
    it('should detect correct platform', () => {
      const platform = process.platform
      expect([
        'win32',
        'darwin',
        'linux',
        'freebsd',
        'openbsd',
        'sunos',
      ]).toContain(platform)
    })

    it('should use correct path separator', () => {
      if (isWindows) {
        expect(path.sep).toBe('\\')
      } else {
        expect(path.sep).toBe('/')
      }
    })

    it('should use correct path delimiter', () => {
      if (isWindows) {
        expect(path.delimiter).toBe(';')
      } else {
        expect(path.delimiter).toBe(':')
      }
    })

    it('should resolve paths correctly on current platform', () => {
      const resolved = path.resolve('test', 'file.txt')
      expect(path.isAbsolute(resolved)).toBe(true)
      if (isWindows) {
        expect(resolved).toMatch(/^[A-Z]:\\/)
      } else {
        expect(resolved).toMatch(/^\//)
      }
    })
  })

  describe('temporary directory - platform specific', () => {
    it('should get platform-specific temp directory', () => {
      const tmpDir = os.tmpdir()
      expect(typeof tmpDir).toBe('string')
      expect(tmpDir.length).toBeGreaterThan(0)
      if (isWindows) {
        expect(tmpDir).toMatch(/^[A-Z]:\\/)
      } else {
        expect(tmpDir).toMatch(/^\//)
      }
    })

    it('should handle temp paths on current platform', () => {
      const tmpFile = path.join(os.tmpdir(), 'test-file.txt')
      expect(path.isAbsolute(tmpFile)).toBe(true)
      if (isWindows) {
        expect(tmpFile).toContain('\\')
      } else {
        expect(tmpFile).toContain('/')
      }
    })
  })

  describe('environment variables - platform specific', () => {
    it('should have platform-specific PATH variable', () => {
      const pathVar = isWindows ? 'Path' : 'PATH'
      const pathValue = process.env[pathVar] || process.env['PATH']
      expect(pathValue).toBeDefined()
      if (isWindows) {
        expect(pathValue).toContain(';')
      } else {
        expect(pathValue).toContain(':')
      }
    })

    it('should handle HOME/USERPROFILE correctly', () => {
      if (isWindows) {
        expect(process.env['USERPROFILE'] || process.env['HOME']).toBeDefined()
      } else {
        expect(process.env['HOME']).toBeDefined()
      }
    })
  })

  describe('CI environment detection', () => {
    it('should detect CI environment if present', () => {
      const isCI = process.env['CI'] === 'true' || process.env['CI'] === '1'
      if (isCI) {
        expect(isCI).toBe(true)
      }
    })

    it('should work in both CI and local environments', () => {
      const ciType = typeof process.env['CI']
      expect(['string', 'undefined']).toContain(ciType)
    })
  })

  describe('platform-specific behavior toggles', () => {
    it('should test Windows-specific code when on Windows', () => {
      if (isWindows) {
        const winPath = 'C:\\Windows\\System32'
        expect(path.win32.isAbsolute(winPath)).toBe(true)
        expect(path.normalize(winPath)).toContain('Windows')
      }
    })

    it('should test POSIX-specific code when on Unix', () => {
      if (!isWindows) {
        const posixPath = '/usr/local/bin'
        expect(path.posix.isAbsolute(posixPath)).toBe(true)
        expect(path.normalize(posixPath)).toContain('usr')
      }
    })

    it('should handle platform-specific line endings', () => {
      if (isWindows) {
        expect(os.EOL).toBe('\r\n')
      } else {
        expect(os.EOL).toBe('\n')
      }
    })
  })

  describe('cross-platform compatibility checks', () => {
    it('should handle both forward and backward slashes', () => {
      const testPath = 'test/path/file.txt'
      const normalized = normalizePath(testPath)
      expect(normalized).toContain('test')
      expect(normalized).toContain('file.txt')
    })

    it('should resolve relative paths on any platform', () => {
      const relative = path.join('..', 'test', 'file.txt')
      const resolved = path.resolve(relative)
      expect(path.isAbsolute(resolved)).toBe(true)
    })

    it('should handle mixed separators gracefully', () => {
      const mixed = 'test\\mixed/separators\\file.txt'
      const normalized = normalizePath(mixed)
      expect(normalized).toBeDefined()
      expect(typeof normalized).toBe('string')
    })
  })

  describe('platform capabilities', () => {
    it('should detect platform architecture', () => {
      const arch = process.arch
      expect(['x64', 'arm64', 'arm', 'ia32', 'ppc64', 's390x']).toContain(arch)
    })

    it('should detect Node.js version', () => {
      const version = process.version
      expect(version).toMatch(/^v\d+\.\d+\.\d+/)
    })

    it('should have correct platform info', () => {
      const info = {
        platform: process.platform,
        arch: process.arch,
        version: process.version,
      }
      expect(info.platform).toBeDefined()
      expect(info.arch).toBeDefined()
      expect(info.version).toBeDefined()
    })
  })
})
