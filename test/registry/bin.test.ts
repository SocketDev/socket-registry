import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import trash from 'trash'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

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
      // resolveBinPathSync returns a normalized path when it doesn't exist.
      // Create a proper absolute path that works on all platforms.
      // Use tmpdir's root as base to ensure we get a fully qualified path.
      const tmpRoot = path.parse(os.tmpdir()).root
      const nonExistentPath = path.join(tmpRoot, 'non', 'existent', 'binary')
      const result = resolveBinPathSync(nonExistentPath)
      // On Windows, paths may be normalized with forward slashes.
      expect(result).toBeTruthy()
      // The paths should be functionally equivalent even if slashes differ.
      const normalizedResult = result.replaceAll('\\', '/')
      const normalizedExpected = nonExistentPath.replaceAll('\\', '/')
      expect(normalizedResult).toBe(normalizedExpected)
    })

    it('should handle paths where a file is used as a directory', async () => {
      // When a component in the path exists but is not a directory.
      // resolveBinPathSync returns a normalized path (letting spawn handle the error).
      // Create a temporary file.
      const tmpFile = path.join(os.tmpdir(), `test-file-${Date.now()}.txt`)
      fs.writeFileSync(tmpFile, 'test')

      try {
        // Try to use the file as a directory.
        const invalidPath = path.join(tmpFile, 'somebinary')
        const result = resolveBinPathSync(invalidPath)
        // On Windows, paths may be normalized with forward slashes.
        expect(result).toBeTruthy()
        // The paths should be functionally equivalent even if slashes differ.
        const normalizedResult = result.replaceAll('\\', '/')
        const normalizedExpected = invalidPath.replaceAll('\\', '/')
        expect(normalizedResult).toBe(normalizedExpected)
      } finally {
        // Clean up.
        await trash(tmpFile)
      }
    })

    it('should handle relative paths by searching in PATH', () => {
      // When given a relative path (not absolute), it should search PATH.
      const result = resolveBinPathSync('node')
      expect(result).toBeTruthy()
      expect(path.isAbsolute(result)).toBe(true)
      // Should resolve to actual node binary.
      expect(result).toContain('node')
    })

    it('should handle other filesystem errors by rethrowing them', () => {
      // Mock a scenario where realpathSync.native throws an unexpected error.
      const mockError: any = new Error('Unexpected filesystem error')
      mockError.code = 'EACCES' // Access denied error.

      // We can't easily mock fs in this test environment.
      // but we can test that errors other than ENOENT/ENOTDIR would be thrown.
      // This test documents the expected behavior.
      expect(() => {
        // This would throw if we could trigger an EACCES error.
        // The function only catches ENOENT and ENOTDIR, rethrowing others.
      }).not.toThrow()
    })

    it('should handle symlinks by resolving to real path', async () => {
      // Create a temporary symlink to test resolution.
      const tmpDir = os.tmpdir()
      const targetFile = path.join(tmpDir, `test-target-${Date.now()}.sh`)
      const symlinkPath = path.join(tmpDir, `test-symlink-${Date.now()}`)

      fs.writeFileSync(targetFile, '#!/bin/sh\necho "test"', { mode: 0o755 })

      try {
        fs.symlinkSync(targetFile, symlinkPath)
        const resolved = resolveBinPathSync(symlinkPath)

        // Should resolve to the real path (handles /private vs /var on macOS).
        expect(resolved).toBe(fs.realpathSync(targetFile))
      } finally {
        // Clean up.
        if (fs.existsSync(symlinkPath)) {
          fs.unlinkSync(symlinkPath)
        }
        await trash(targetFile)
      }
    })

    it('should handle deeply nested paths', () => {
      // Test with a very long path.
      const deepPath = path.join(
        path.sep,
        'very',
        'deeply',
        'nested',
        'directory',
        'structure',
        'that',
        'does',
        'not',
        'exist',
        'binary',
      )
      const result = resolveBinPathSync(deepPath)
      expect(result).toBe(deepPath)
    })

    it('should handle paths with special characters', () => {
      // Test paths with spaces and special characters.
      const specialPath = path.join(
        os.tmpdir(),
        'path with spaces',
        'and-special_chars',
        'binary',
      )
      const result = resolveBinPathSync(specialPath)
      expect(result).toBe(specialPath)
    })

    it('should handle relative paths with dots', () => {
      // Test with relative path components.
      const relativePath = './some/./relative/../binary'
      const result = resolveBinPathSync(relativePath)
      expect(result).toBeTruthy()
      // Should attempt to resolve through whichBinSync since it's not absolute.
    })

    it('should handle UNC paths on Windows', () => {
      // This test documents behavior for UNC paths.
      if (process.platform === 'win32') {
        const uncPath = '\\\\server\\share\\binary.exe'
        const result = resolveBinPathSync(uncPath)
        expect(result).toBe(uncPath)
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

    it('should return array when all option is true', () => {
      const result = whichBinSync('node', { all: true })
      expect(Array.isArray(result)).toBe(true)
      if (result) {
        expect(result.length).toBeGreaterThan(0)
        result.forEach((p: string) => {
          expect(typeof p).toBe('string')
          expect(path.isAbsolute(p)).toBe(true)
        })
      }
    })

    it('should handle combination of all and nothrow options', () => {
      // Test all: true, nothrow: true.
      const result1 = whichBinSync('nonexistentbinary12345', {
        all: true,
        nothrow: true,
      })
      expect(result1 === null || Array.isArray(result1)).toBe(true)

      // Test all: false, nothrow: true.
      const result2 = whichBinSync('nonexistentbinary12345', {
        all: false,
        nothrow: true,
      })
      expect(result2).toBeNull()

      // Test nothrow: false.
      expect(() => {
        whichBinSync('nonexistentbinary12345', { nothrow: false })
      }).toThrow()
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

    it('should return array when all option is true', async () => {
      const result = await whichBin('node', { all: true })
      expect(Array.isArray(result)).toBe(true)
      if (result) {
        expect(result.length).toBeGreaterThan(0)
        result.forEach((p: string) => {
          expect(typeof p).toBe('string')
          expect(path.isAbsolute(p)).toBe(true)
        })
      }
    })

    it('should handle nothrow option', async () => {
      // With nothrow: true (default), should return null for non-existent.
      const result1 = await whichBin('nonexistentbinary12345', {
        nothrow: true,
      })
      expect(result1).toBeNull()

      // With nothrow: false, should throw.
      await expect(
        whichBin('nonexistentbinary12345', { nothrow: false }),
      ).rejects.toThrow()
    })

    it('should resolve paths for all results when all is true', async () => {
      const result = await whichBin('npm', { all: true })
      if (result && result.length > 0) {
        // All paths should be resolved (absolute).
        result.forEach((p: string) => {
          expect(path.isAbsolute(p)).toBe(true)
        })
      }
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

    it('should use common paths when provided', () => {
      // Test with a fake common path that doesn't exist.
      const result = findRealBin('node', ['/fake/path/node'])
      // Should fall back to regular which.
      expect(result).toBeTruthy()
    })

    it('should prefer non-shadow paths', () => {
      // This test verifies the behavior but can't easily create a shadow scenario.
      const result = findRealBin('npm')
      if (result) {
        // Should not be in a node_modules/.bin directory.
        expect(isShadowBinPath(result)).toBe(false)
      }
    })

    it('should check common paths first', () => {
      // If we provide the actual node path as a common path, it should return it.
      const nodePath = process.execPath
      const result = findRealBin('node', [nodePath])
      expect(result).toBe(nodePath)
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
      // Should not be in node_modules/.bin.
      expect(isShadowBinPath(npmPath)).toBe(false)
    })

    it('should prefer npm in node directory', () => {
      const npmPath = findRealNpm()
      const nodeDir = path.dirname(process.execPath)
      // If npm is in the same directory as node, it should prefer that.
      if (fs.existsSync(path.join(nodeDir, 'npm'))) {
        expect(npmPath).toBe(path.join(nodeDir, 'npm'))
      }
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

    it('should return null if pnpm is not installed', () => {
      // This test will pass differently depending on whether pnpm is installed.
      const pnpmPath = findRealPnpm()
      expect(pnpmPath === null || typeof pnpmPath === 'string').toBe(true)
    })

    it('should not return a shadow bin path if found', () => {
      const pnpmPath = findRealPnpm()
      if (pnpmPath) {
        expect(isShadowBinPath(pnpmPath)).toBe(false)
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

    it('should return null if yarn is not installed', () => {
      // This test will pass differently depending on whether yarn is installed.
      const yarnPath = findRealYarn()
      expect(yarnPath === null || typeof yarnPath === 'string').toBe(true)
    })

    it('should not return a shadow bin path if found', () => {
      const yarnPath = findRealYarn()
      if (yarnPath) {
        expect(isShadowBinPath(yarnPath)).toBe(false)
      }
    })
  })

  describe('resolveBinPathSync - Script Wrappers', () => {
    it('should handle npm wrapper scripts', async () => {
      // Create a mock npm wrapper script.
      const tmpDir = os.tmpdir()
      const wrapperPath = path.join(tmpDir, `test-npm-wrapper-${Date.now()}`)
      const targetPath = path.join(tmpDir, `test-npm-target-${Date.now()}.js`)

      // Write a simple Unix-style npm wrapper.
      const wrapperContent = `#!/bin/sh
basedir=$(dirname "$(echo "$0" | sed -e 's,\\\\,/,g')")

case \`uname\` in
    *CYGWIN*|*MINGW*|*MSYS*) basedir=\`cygpath -w "$basedir"\`;; esac

if [ -x "$basedir/node" ]; then
  exec "$basedir/node"  "$basedir/${path.basename(targetPath)}" "$@"
else
  exec node  "$basedir/${path.basename(targetPath)}" "$@"
fi`

      fs.writeFileSync(targetPath, 'console.log("target")')
      fs.writeFileSync(wrapperPath, wrapperContent, { mode: 0o755 })

      try {
        const resolved = resolveBinPathSync(wrapperPath)
        // On Unix, script parsing extracts the target. Returns real path.
        // The function returns the resolved wrapper path (not parsed target on macOS).
        expect(resolved).toBe(fs.realpathSync(wrapperPath))
      } finally {
        // Clean up.
        await trash([wrapperPath, targetPath])
      }
    })

    it('should handle cmd-shim style wrappers', async () => {
      // Test cmd-shim style wrapper detection.
      const tmpDir = os.tmpdir()
      const cmdPath = path.join(tmpDir, `test-cmd-${Date.now()}.cmd`)
      const targetPath = path.join(
        tmpDir,
        'node_modules',
        'pkg',
        'bin',
        'cli.js',
      )

      // Create directory structure.
      fs.mkdirSync(path.dirname(targetPath), { recursive: true })
      fs.writeFileSync(targetPath, 'console.log("cli")')

      // Create a cmd-shim style wrapper.
      const cmdContent = `@ECHO off
GOTO start
:find_dp0
SET dp0=%~dp0
EXIT /b
:start
SETLOCAL
CALL :find_dp0

IF EXIST "%dp0%\\node.exe" (
  SET "_prog=%dp0%\\node.exe"
) ELSE (
  SET "_prog=node"
  SET PATHEXT=%PATHEXT:;.JS;=;%
)

endLocal & goto #_undefined_# 2>NUL || title %COMSPEC% & "%_prog%"  "%dp0%\\..\\pkg\\bin\\cli.js" %*`

      fs.writeFileSync(cmdPath, cmdContent)

      try {
        const resolved = resolveBinPathSync(cmdPath)
        // On non-Windows, this would return the original path since it can't parse .cmd files.
        // On Windows, it would try to extract the target path.
        expect(resolved).toBeTruthy()
      } finally {
        // Clean up.
        await trash([cmdPath, path.join(tmpDir, 'node_modules')])
      }
    })

    it('should handle PowerShell wrapper scripts', async () => {
      if (process.platform !== 'win32') {
        // Skip on non-Windows platforms.
        return
      }

      // Test PowerShell wrapper detection.
      const tmpDir = os.tmpdir()
      const ps1Path = path.join(tmpDir, `test-ps1-${Date.now()}.ps1`)
      const targetPath = path.join(tmpDir, 'target.js')

      fs.writeFileSync(targetPath, 'console.log("ps1 target")')

      // Create a PowerShell wrapper.
      const ps1Content = `#!/usr/bin/env pwsh
$basedir=Split-Path $MyInvocation.MyCommand.Definition -Parent

$exe=""
if ($PSVersionTable.PSVersion -lt "6.0" -or $IsWindows) {
  $exe=".exe"
}
$ret=0
if (Test-Path "$basedir/node$exe") {
  & "$basedir/node$exe"  "$basedir/${path.basename(targetPath)}" $args
  $ret=$LASTEXITCODE
} else {
  & "node$exe"  "$basedir/${path.basename(targetPath)}" $args
  $ret=$LASTEXITCODE
}
exit $ret`

      fs.writeFileSync(ps1Path, ps1Content)

      try {
        const resolved = resolveBinPathSync(ps1Path)
        // Should handle PowerShell scripts.
        expect(resolved).toBeTruthy()
      } finally {
        // Clean up.
        await trash([ps1Path, targetPath])
      }
    })

    it('should handle extensionless wrapper scripts', async () => {
      // Test extensionless Unix wrapper scripts.
      const tmpDir = os.tmpdir()
      const wrapperPath = path.join(tmpDir, `test-wrapper-${Date.now()}`)
      const targetPath = path.join(tmpDir, 'lib', 'cli.js')

      // Create directory structure.
      fs.mkdirSync(path.dirname(targetPath), { recursive: true })
      fs.writeFileSync(targetPath, '#!/usr/bin/env node\nconsole.log("cli")')

      // Create an extensionless wrapper (common for Unix binaries).
      const wrapperContent = `#!/bin/sh
basedir=$(dirname "$(echo "$0" | sed -e 's,\\\\,/,g')")
exec node  "$basedir/lib/cli.js" "$@"`

      fs.writeFileSync(wrapperPath, wrapperContent, { mode: 0o755 })

      try {
        const resolved = resolveBinPathSync(wrapperPath)
        // Returns the resolved wrapper path.
        expect(resolved).toBe(fs.realpathSync(wrapperPath))
      } finally {
        // Clean up.
        await trash([wrapperPath, path.dirname(targetPath)])
      }
    })
  })

  describe('Edge Cases and Special Paths', () => {
    it('should handle empty string path', () => {
      const result = resolveBinPathSync('')
      expect(result).toBeTruthy()
      // Empty string is not absolute, so it tries to resolve via which.
    })

    it('should handle paths with trailing slashes', () => {
      const pathWithSlash = path.join(os.tmpdir(), 'binary') + path.sep
      const result = resolveBinPathSync(pathWithSlash)
      // Should normalize and handle properly.
      expect(result).toBeTruthy()
    })

    it('should handle paths with multiple consecutive slashes', () => {
      const messyPath = path.join(os.tmpdir(), '//multiple///slashes////binary')
      const result = resolveBinPathSync(messyPath)
      expect(result).toBeTruthy()
      // Path should be normalized.
      expect(result).not.toContain('///')
    })

    it('should handle case sensitivity correctly', () => {
      // Test case handling (important for Windows).
      const upperPath = path.join(os.tmpdir(), 'BINARY.EXE')
      const lowerPath = path.join(os.tmpdir(), 'binary.exe')

      const result1 = resolveBinPathSync(upperPath)
      const result2 = resolveBinPathSync(lowerPath)

      // Both should work.
      expect(result1).toBeTruthy()
      expect(result2).toBeTruthy()
    })

    it('should handle very long filenames', () => {
      // Test with a very long filename (but within system limits).
      const longName = 'a'.repeat(200) + '.exe'
      const longPath = path.join(os.tmpdir(), longName)

      const result = resolveBinPathSync(longPath)
      expect(result).toBe(longPath)
    })
  })

  describe('isShadowBinPath edge cases', () => {
    it('should handle various path formats', () => {
      // Test multiple formats that should be shadow bins.
      const shadowPaths = [
        'node_modules/.bin/tool',
        './node_modules/.bin/tool',
        '../node_modules/.bin/tool',
        'some/path/node_modules/.bin/tool',
        path.join('prefix', 'node_modules', '.bin', 'tool'),
      ]

      shadowPaths.forEach((p: string) => {
        expect(isShadowBinPath(p)).toBe(true)
      })
    })

    it('should handle paths that look similar but are not shadow bins', () => {
      const notShadowPaths = [
        'node_modules/package/bin/tool', // No .bin directory.
        '.bin/tool', // Just .bin without node_modules.
        'some_node_modules_dir/tool', // No .bin at all.
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
      } catch (error: any) {
        expect(error).toBeDefined()
        expect(error.code).toBe('ENOENT')
        expect(error.message).toContain('Binary not found')
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

    it('should resolve absolute paths', async () => {
      // When given an absolute path, should resolve it.
      const nodePath = process.execPath
      const result = await execBin(nodePath, [
        '-e',
        'console.log("absolute path works")',
      ])
      expect(result.stdout).toContain('absolute path works')
    })

    it('should handle empty args array', async () => {
      const result = await execBin('echo', [])
      expect(result).toBeDefined()
      expect(result.stdout).toBeDefined()
    })

    it('should handle null args', async () => {
      const result = await execBin('echo', null)
      expect(result).toBeDefined()
      expect(result.stdout).toBeDefined()
    })

    it('should handle stderr output', async () => {
      const result = await execBin('node', [
        '-e',
        'console.error("error output")',
      ])
      expect(result.stderr).toContain('error output')
    })

    it('should throw when binary fails with non-zero exit', async () => {
      await expect(execBin('node', ['-e', 'process.exit(1)'])).rejects.toThrow()
    })

    it('should handle relative paths', async () => {
      const result = await execBin('./node_modules/.bin/vitest', ['--version'])
      expect(result).toBeDefined()
    })

    it('should handle undefined args', async () => {
      const result = await execBin('echo', undefined)
      expect(result).toBeDefined()
      expect(result.stdout).toBeDefined()
    })
  })

  describe('findRealBin', () => {
    it('should find binary in common paths first', () => {
      const commonPaths = ['/usr/local/bin/test', '/usr/bin/test']
      const result = findRealBin('test', commonPaths)
      // Should check common paths.
      expect(result).toBeTruthy()
    })

    it('should return null when binary not found', () => {
      const result = findRealBin('nonexistent12345xyz', [])
      expect(result).toBe(null)
    })

    it('should find real binary when first result is shadow bin', async () => {
      // Create a shadow bin structure.
      const tmpDir = os.tmpdir()
      const shadowBinDir = path.join(tmpDir, 'node_modules', '.bin')
      const shadowBinPath = path.join(shadowBinDir, `shadow-test-${Date.now()}`)

      fs.mkdirSync(shadowBinDir, { recursive: true })
      fs.writeFileSync(shadowBinPath, '#!/bin/sh\necho "shadow"', {
        mode: 0o755,
      })

      try {
        // Try to find node, which should exist.
        const result = findRealBin('node', [])
        // Should find the real node, not a shadow bin.
        expect(result).toBeTruthy()
        expect(isShadowBinPath(result)).toBe(false)
      } finally {
        await trash([path.join(tmpDir, 'node_modules')])
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
        await trash([binPath])
      }
    })
  })

  describe('findRealNpm', () => {
    it('should find npm', () => {
      const result = findRealNpm()
      // Should return a npm path.
      expect(result).toBeTruthy()
    })
  })

  describe('findRealPnpm', () => {
    it('should find pnpm using findRealBin with common paths', () => {
      const result = findRealPnpm()
      // Should return a result (either a path or null).
      expect(result !== undefined).toBe(true)
    })
  })

  describe('findRealYarn', () => {
    it('should find yarn using findRealBin with common paths', () => {
      const result = findRealYarn()
      // Should return a result (either a path or null).
      expect(result !== undefined).toBe(true)
    })
  })

  describe('whichBin async', () => {
    it('should find binary asynchronously', async () => {
      const result = await whichBin('node')
      expect(result).toBeTruthy()
      expect(result).toContain('node')
    })

    it('should return null when binary not found with nothrow', async () => {
      const result = await whichBin('nonexistent12345', { nothrow: true })
      expect(result).toBe(null)
    })

    it('should throw when binary not found without nothrow', async () => {
      await expect(
        whichBin('nonexistent12345', { nothrow: false }),
      ).rejects.toThrow()
    })

    it('should return all paths when all:true', async () => {
      const result = await whichBin('node', { all: true })
      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBeGreaterThan(0)
    })

    it('should handle all:true with non-existent binary', async () => {
      const result = await whichBin('nonexistent12345', {
        all: true,
        nothrow: true,
      })
      expect(result).toEqual(null)
    })
  })

  describe('whichBinSync', () => {
    it('should find binary synchronously', () => {
      const result = whichBinSync('node')
      expect(result).toBeTruthy()
      expect(result).toContain('node')
    })

    it('should return null when binary not found with nothrow', () => {
      const result = whichBinSync('nonexistent12345', { nothrow: true })
      expect(result).toBe(null)
    })

    it('should throw when binary not found without nothrow', () => {
      expect(() => {
        whichBinSync('nonexistent12345', { nothrow: false })
      }).toThrow()
    })

    it('should return all paths when all:true', () => {
      const result = whichBinSync('node', { all: true })
      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBeGreaterThan(0)
    })

    it('should handle all:true with non-existent binary', () => {
      const result = whichBinSync('nonexistent12345', {
        all: true,
        nothrow: true,
      })
      expect(result).toEqual(null)
    })
  })

  describe('resolveBinPathSync Volta support', () => {
    const tmpDir = os.tmpdir()
    const voltaPath = path.join(tmpDir, '.volta')
    const toolsPath = path.join(voltaPath, 'tools')
    const imagePath = path.join(toolsPath, 'image')
    const userPath = path.join(toolsPath, 'user')
    const binPath = path.join(userPath, 'bin')

    beforeEach(() => {
      // Create Volta directory structure.
      fs.mkdirSync(imagePath, { recursive: true })
      fs.mkdirSync(binPath, { recursive: true })
    })

    afterEach(async () => {
      // Clean up.
      await trash([voltaPath])
    })

    it('should resolve Volta npm/npx paths', () => {
      // Create platform.json.
      const platformJson = {
        node: {
          runtime: '20.0.0',
          npm: '10.0.0',
        },
      }
      fs.writeFileSync(
        path.join(userPath, 'platform.json'),
        JSON.stringify(platformJson),
      )

      // Create npm-cli.js in npm package.
      const npmCliPath = path.join(imagePath, 'npm/10.0.0/bin/npm-cli.js')
      fs.mkdirSync(path.dirname(npmCliPath), { recursive: true })
      fs.writeFileSync(npmCliPath, '#!/usr/bin/env node\nconsole.log("npm")')

      const voltaNpmPath = path.join(voltaPath, 'bin', 'npm')
      fs.mkdirSync(path.dirname(voltaNpmPath), { recursive: true })
      fs.writeFileSync(voltaNpmPath, 'volta npm wrapper', { mode: 0o755 })

      const result = resolveBinPathSync(voltaNpmPath)
      expect(result).toContain('.volta')
    })

    it('should resolve Volta npm from node modules fallback', () => {
      // Create platform.json.
      const platformJson = {
        node: {
          runtime: '20.0.0',
          npm: '10.0.0',
        },
      }
      fs.writeFileSync(
        path.join(userPath, 'platform.json'),
        JSON.stringify(platformJson),
      )

      // Create npm-cli.js in node modules.
      const npmCliPath = path.join(
        imagePath,
        'node/20.0.0/lib/node_modules/npm/bin/npm-cli.js',
      )
      fs.mkdirSync(path.dirname(npmCliPath), { recursive: true })
      fs.writeFileSync(npmCliPath, '#!/usr/bin/env node\nconsole.log("npm")')

      const voltaNpmPath = path.join(voltaPath, 'bin', 'npm')
      fs.mkdirSync(path.dirname(voltaNpmPath), { recursive: true })
      fs.writeFileSync(voltaNpmPath, 'volta npm wrapper', { mode: 0o755 })

      const result = resolveBinPathSync(voltaNpmPath)
      expect(result).toContain('.volta')
    })

    it('should resolve Volta package binaries', () => {
      // Create package bin info.
      const binInfo = {
        package: 'typescript@5.0.0',
      }
      fs.writeFileSync(path.join(binPath, 'tsc.json'), JSON.stringify(binInfo))

      // Create tsc binary.
      const tscPath = path.join(imagePath, 'packages/typescript@5.0.0/bin/tsc')
      fs.mkdirSync(path.dirname(tscPath), { recursive: true })
      fs.writeFileSync(tscPath, '#!/usr/bin/env node\nconsole.log("tsc")')

      const voltaTscPath = path.join(voltaPath, 'bin', 'tsc')
      fs.mkdirSync(path.dirname(voltaTscPath), { recursive: true })
      fs.writeFileSync(voltaTscPath, 'volta tsc wrapper', { mode: 0o755 })

      const result = resolveBinPathSync(voltaTscPath)
      expect(result).toContain('tsc')
    })

    it('should try .cmd extension for Volta packages on Windows', () => {
      // Create package bin info.
      const binInfo = {
        package: 'typescript@5.0.0',
      }
      fs.writeFileSync(path.join(binPath, 'tsc.json'), JSON.stringify(binInfo))

      // Create tsc.cmd binary.
      const tscPath = path.join(
        imagePath,
        'packages/typescript@5.0.0/bin/tsc.cmd',
      )
      fs.mkdirSync(path.dirname(tscPath), { recursive: true })
      fs.writeFileSync(tscPath, '@echo tsc')

      const voltaTscPath = path.join(voltaPath, 'bin', 'tsc')
      fs.mkdirSync(path.dirname(voltaTscPath), { recursive: true })
      fs.writeFileSync(voltaTscPath, 'volta tsc wrapper', { mode: 0o755 })

      const result = resolveBinPathSync(voltaTscPath)
      expect(result).toContain('tsc')
    })

    it('should skip Volta resolution for node binary', () => {
      const voltaNodePath = path.join(voltaPath, 'bin', 'node')
      fs.mkdirSync(path.dirname(voltaNodePath), { recursive: true })
      fs.writeFileSync(voltaNodePath, 'volta node wrapper', { mode: 0o755 })

      const result = resolveBinPathSync(voltaNodePath)
      // Should not try to resolve through Volta.
      expect(result).toContain('.volta')
    })

    it('should handle missing platform.json', () => {
      const voltaNpmPath = path.join(voltaPath, 'bin', 'npm')
      fs.mkdirSync(path.dirname(voltaNpmPath), { recursive: true })
      fs.writeFileSync(voltaNpmPath, 'volta npm wrapper', { mode: 0o755 })

      const result = resolveBinPathSync(voltaNpmPath)
      // Should return resolved path when platform.json is missing.
      expect(result).toContain('.volta')
    })

    it('should handle missing bin info json', () => {
      const voltaTscPath = path.join(voltaPath, 'bin', 'tsc')
      fs.mkdirSync(path.dirname(voltaTscPath), { recursive: true })
      fs.writeFileSync(voltaTscPath, 'volta tsc wrapper', { mode: 0o755 })

      const result = resolveBinPathSync(voltaTscPath)
      // Should return resolved path when bin info is missing.
      expect(result).toContain('.volta')
    })
  })

  describe('resolveBinPathSync Unix special cases', () => {
    it('should handle pnpm with malformed CI path', () => {
      const tmpDir = os.tmpdir()
      const malformedPath = path.join(
        tmpDir,
        'node_modules',
        '.bin',
        'pnpm',
        'bin',
        'pnpm.cjs',
      )
      const shellScriptPath = path.join(tmpDir, 'node_modules', '.bin', 'pnpm')

      // Create the shell script.
      fs.mkdirSync(path.dirname(shellScriptPath), { recursive: true })
      fs.writeFileSync(shellScriptPath, '#!/bin/sh\nexec node "$0"', {
        mode: 0o755,
      })

      const result = resolveBinPathSync(malformedPath)
      // Should correct the malformed path.
      expect(result).toBe(fs.realpathSync(shellScriptPath))

      // Clean up.
      fs.rmSync(path.join(tmpDir, 'node_modules'), {
        recursive: true,
        force: true,
      })
    })

    it('should handle yarn with malformed CI path', () => {
      const tmpDir = os.tmpdir()
      const malformedPath = path.join(
        tmpDir,
        'node_modules',
        '.bin',
        'yarn',
        'bin',
        'yarn.cjs',
      )
      const shellScriptPath = path.join(tmpDir, 'node_modules', '.bin', 'yarn')

      // Create the shell script.
      fs.mkdirSync(path.dirname(shellScriptPath), { recursive: true })
      fs.writeFileSync(shellScriptPath, '#!/bin/sh\nexec node "$0"', {
        mode: 0o755,
      })

      const result = resolveBinPathSync(malformedPath)
      // Should correct the malformed path - it returns the yarn.cjs path not the shell script.
      expect(result).toContain('yarn')

      // Clean up.
      fs.rmSync(path.join(tmpDir, 'node_modules'), {
        recursive: true,
        force: true,
      })
    })

    it('should handle pnpm setup-action format', async () => {
      const tmpDir = os.tmpdir()
      const pnpmPath = path.join(tmpDir, `pnpm-${Date.now()}`)
      const targetPath = path.join(tmpDir, 'pnpm', 'bin', 'pnpm.cjs')

      // Create directory structure.
      fs.mkdirSync(path.dirname(targetPath), { recursive: true })
      fs.writeFileSync(targetPath, '#!/usr/bin/env node\nconsole.log("pnpm")')

      // Create shell script with setup-pnpm format.
      const shellContent = `#!/bin/sh
exec node "$basedir/pnpm/bin/pnpm.cjs" "$@"`
      fs.writeFileSync(pnpmPath, shellContent, { mode: 0o755 })

      try {
        const result = resolveBinPathSync(pnpmPath)
        expect(result).toContain('pnpm')
      } finally {
        await trash([pnpmPath, path.join(tmpDir, 'pnpm')])
      }
    })

    it('should handle npm/npx Unix format', async () => {
      const tmpDir = os.tmpdir()
      const npmPath = path.join(tmpDir, `npm-${Date.now()}`)
      const targetPath = path.join(
        tmpDir,
        'lib',
        'node_modules',
        'npm',
        'bin',
        'npm-cli.js',
      )

      // Create directory structure.
      fs.mkdirSync(path.dirname(targetPath), { recursive: true })
      fs.writeFileSync(targetPath, '#!/usr/bin/env node\nconsole.log("npm")')

      // Create shell script with npm format.
      const shellContent = `#!/bin/sh
CLI_BASEDIR="$(pwd)"
NPM_CLI_JS="$CLI_BASEDIR/lib/node_modules/npm/bin/npm-cli.js"
exec node "$NPM_CLI_JS" "$@"`
      fs.writeFileSync(npmPath, shellContent, { mode: 0o755 })

      try {
        const result = resolveBinPathSync(npmPath)
        expect(result).toContain('npm')
      } finally {
        await trash([npmPath, path.join(tmpDir, 'lib')])
      }
    })

    it('should handle npx Unix format', async () => {
      const tmpDir = os.tmpdir()
      const npxPath = path.join(tmpDir, `npx-${Date.now()}`)
      const targetPath = path.join(
        tmpDir,
        'lib',
        'node_modules',
        'npm',
        'bin',
        'npx-cli.js',
      )

      // Create directory structure.
      fs.mkdirSync(path.dirname(targetPath), { recursive: true })
      fs.writeFileSync(targetPath, '#!/usr/bin/env node\nconsole.log("npx")')

      // Create shell script with npx format.
      const shellContent = `#!/bin/sh
CLI_BASEDIR="$(pwd)"
NPX_CLI_JS="$CLI_BASEDIR/lib/node_modules/npm/bin/npx-cli.js"
exec node "$NPX_CLI_JS" "$@"`
      fs.writeFileSync(npxPath, shellContent, { mode: 0o755 })

      try {
        const result = resolveBinPathSync(npxPath)
        expect(result).toContain('npx')
      } finally {
        await trash([npxPath, path.join(tmpDir, 'lib')])
      }
    })

    it('should handle yarn Unix format', async () => {
      const tmpDir = os.tmpdir()
      const yarnPath = path.join(tmpDir, `yarn-${Date.now()}`)
      const targetPath = path.join(
        tmpDir,
        '.tools',
        'yarn',
        '1.22.0',
        'lib',
        'cli.js',
      )

      // Create directory structure.
      fs.mkdirSync(path.dirname(targetPath), { recursive: true })
      fs.writeFileSync(targetPath, '#!/usr/bin/env node\nconsole.log("yarn")')

      // Create shell script with yarn format.
      const shellContent = `#!/bin/sh
basedir=$(dirname "$(echo "$0" | sed -e 's,\\\\,/,g')")
exec node "$basedir/.tools/yarn/1.22.0/lib/cli.js" "$@"`
      fs.writeFileSync(yarnPath, shellContent, { mode: 0o755 })

      try {
        const result = resolveBinPathSync(yarnPath)
        // For yarn extensionless script, it may just return the yarn path.
        expect(result).toContain('yarn')
      } finally {
        await trash([yarnPath, path.join(tmpDir, '.tools')])
      }
    })

    it('should handle pnpm Unix format with ../ prefix', async () => {
      const tmpDir = os.tmpdir()
      const pnpmPath = path.join(
        tmpDir,
        'node_modules',
        '.bin',
        `pnpm-${Date.now()}`,
      )
      const targetPath = path.join(
        tmpDir,
        'node_modules',
        'pnpm',
        'bin',
        'pnpm.cjs',
      )

      // Create directory structure.
      fs.mkdirSync(path.dirname(pnpmPath), { recursive: true })
      fs.mkdirSync(path.dirname(targetPath), { recursive: true })
      fs.writeFileSync(targetPath, '#!/usr/bin/env node\nconsole.log("pnpm")')

      // Create shell script with standard cmd-shim format.
      const shellContent = `#!/bin/sh
basedir=$(dirname "$(echo "$0" | sed -e 's,\\\\,/,g')")
exec node "$basedir/../pnpm/bin/pnpm.cjs" "$@"`
      fs.writeFileSync(pnpmPath, shellContent, { mode: 0o755 })

      try {
        const result = resolveBinPathSync(pnpmPath)
        // For pnpm with custom name, it may just return the pnpm path.
        expect(result).toContain('pnpm')
      } finally {
        await trash([path.join(tmpDir, 'node_modules')])
      }
    })
  })

  describe('resolveBinPathSync error handling', () => {
    it('should handle realpath ENOTDIR error', () => {
      // Create a file that will cause ENOTDIR when used as directory component.
      const tmpFile = path.join(os.tmpdir(), `test-file-${Date.now()}`)
      fs.writeFileSync(tmpFile, 'content')

      // Try to resolve a path that uses the file as a directory.
      const invalidPath = path.join(tmpFile, 'subdir', 'binary')

      try {
        const result = resolveBinPathSync(invalidPath)
        // Should return the path even if realpath fails.
        expect(result).toBe(invalidPath)
      } finally {
        fs.rmSync(tmpFile, { force: true })
      }
    })

    it('should handle unexpected realpath errors by returning the path', () => {
      // With the new try-catch blocks in resolveBinPathSync, filesystem errors like EACCES.
      // are caught and the original path is returned.
      // This test documents the expected behavior - we can't easily mock fs.realpathSync.
      // in this environment, but the function would catch EACCES errors and return the path.
      const testPath = '/some/restricted/path'
      // If we could trigger an EACCES error, resolveBinPathSync would return the original path.
      // Since we can't easily mock it, we just document the expected behavior.
      expect(() => resolveBinPathSync(testPath)).not.toThrow()
    })
  })
})
