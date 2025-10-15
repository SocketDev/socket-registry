import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  clearDlx,
  clearDlxSync,
  dlxDirExists,
  dlxDirExistsAsync,
  ensureDlxDir,
  ensureDlxDirSync,
  getDlxInstalledPackageDir,
  getDlxPackageDir,
  getDlxPackageJsonPath,
  getDlxPackageNodeModulesDir,
  isDlxPackageInstalled,
  isDlxPackageInstalledAsync,
  listDlxPackages,
  listDlxPackagesAsync,
  removeDlxPackage,
  removeDlxPackageSync,
} from '../../registry/dist/lib/dlx.js'

// Test package names.
const TEST_PKG = 'test-package'
const TEST_PKG_2 = 'test-package-2'

describe('dlx module', () => {
  let originalSocketDir: string | undefined
  let testDlxDir: string

  beforeEach(async () => {
    // Create a temporary DLX directory for testing.
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'socket-dlx-test-'))
    testDlxDir = path.join(tmpDir, '_dlx')

    // Override the Socket directory for testing.
    originalSocketDir = process.env['SOCKET_USER_DIR']
    process.env['SOCKET_USER_DIR'] = tmpDir

    await ensureDlxDir()
  })

  afterEach(async () => {
    // Clean up all packages first.
    try {
      const packages = await listDlxPackagesAsync()
      await Promise.all(packages.map(pkg => removeDlxPackage(pkg)))
    } catch {
      // Ignore cleanup errors.
    }

    // Restore original environment.
    if (originalSocketDir === undefined) {
      delete process.env['SOCKET_USER_DIR']
    } else {
      process.env['SOCKET_USER_DIR'] = originalSocketDir
    }

    // Clean up test directory.
    try {
      const parentDir = path.dirname(testDlxDir)
      await fs.rm(parentDir, { recursive: true, force: true })
    } catch {
      // Ignore cleanup errors.
    }
  })

  describe('clearDlx', () => {
    it('should remove all packages', async () => {
      // Create test packages.
      await fs.mkdir(getDlxPackageDir(TEST_PKG), { recursive: true })
      await fs.mkdir(getDlxPackageDir(TEST_PKG_2), { recursive: true })

      await clearDlx()

      const packages = await listDlxPackagesAsync()
      expect(packages).toEqual([])
    })

    it('should handle empty dlx directory', async () => {
      await expect(clearDlx()).resolves.toBeUndefined()
    })
  })

  describe('clearDlxSync', () => {
    it('should remove all packages synchronously', () => {
      // Create test packages synchronously.
      const { mkdirSync } = require('node:fs')
      mkdirSync(getDlxPackageDir(TEST_PKG), { recursive: true })
      mkdirSync(getDlxPackageDir(TEST_PKG_2), { recursive: true })

      clearDlxSync()

      const packages = listDlxPackages()
      expect(packages).toEqual([])
    })
  })

  describe('dlxDirExists and dlxDirExistsAsync', () => {
    it('should return true when dlx directory exists', () => {
      expect(dlxDirExists()).toBe(true)
    })

    it('should return true when dlx directory exists asynchronously', async () => {
      expect(await dlxDirExistsAsync()).toBe(true)
    })
  })

  describe('ensureDlxDir and ensureDlxDirSync', () => {
    it('should create dlx directory if it does not exist', async () => {
      await fs.rm(testDlxDir, { recursive: true, force: true })

      await ensureDlxDir()

      expect(dlxDirExists()).toBe(true)
    })

    it('should create dlx directory synchronously if it does not exist', async () => {
      await fs.rm(testDlxDir, { recursive: true, force: true })

      ensureDlxDirSync()

      expect(dlxDirExists()).toBe(true)
    })

    it('should not error if directory already exists', async () => {
      await expect(ensureDlxDir()).resolves.toBeUndefined()
      expect(() => ensureDlxDirSync()).not.toThrow()
    })
  })

  describe('getDlxInstalledPackageDir', () => {
    it('should return correct path for installed package', () => {
      const dir = getDlxInstalledPackageDir(TEST_PKG)
      expect(dir).toContain('_dlx')
      expect(dir).toContain('node_modules')
      expect(dir).toContain(TEST_PKG)
    })
  })

  describe('getDlxPackageDir', () => {
    it('should return correct path for package', () => {
      const dir = getDlxPackageDir(TEST_PKG)
      expect(dir).toContain('_dlx')
      expect(dir).toContain(TEST_PKG)
      expect(dir).not.toContain('node_modules')
    })
  })

  describe('getDlxPackageJsonPath', () => {
    it('should return correct path for package.json', () => {
      const jsonPath = getDlxPackageJsonPath(TEST_PKG)
      expect(jsonPath).toContain('_dlx')
      expect(jsonPath).toContain('node_modules')
      expect(jsonPath).toContain(TEST_PKG)
      expect(jsonPath).toContain('package.json')
    })
  })

  describe('getDlxPackageNodeModulesDir', () => {
    it('should return correct path for node_modules', () => {
      const dir = getDlxPackageNodeModulesDir(TEST_PKG)
      expect(dir).toContain('_dlx')
      expect(dir).toContain(TEST_PKG)
      expect(dir).toContain('node_modules')
    })
  })

  describe('isDlxPackageInstalled and isDlxPackageInstalledAsync', () => {
    it('should return true when package is installed', async () => {
      await fs.mkdir(getDlxInstalledPackageDir(TEST_PKG), { recursive: true })

      expect(isDlxPackageInstalled(TEST_PKG)).toBe(true)
      expect(await isDlxPackageInstalledAsync(TEST_PKG)).toBe(true)
    })

    it('should return false when package is not installed', () => {
      expect(isDlxPackageInstalled('non-existent-package')).toBe(false)
    })

    it('should return false when package is not installed asynchronously', async () => {
      expect(await isDlxPackageInstalledAsync('non-existent-package')).toBe(
        false,
      )
    })
  })

  describe('listDlxPackages and listDlxPackagesAsync', () => {
    it('should list all installed packages', async () => {
      await fs.mkdir(getDlxPackageDir(TEST_PKG), { recursive: true })
      await fs.mkdir(getDlxPackageDir(TEST_PKG_2), { recursive: true })

      const packages = listDlxPackages()
      const packagesAsync = await listDlxPackagesAsync()

      expect(packages).toEqual([TEST_PKG, TEST_PKG_2])
      expect(packagesAsync).toEqual([TEST_PKG, TEST_PKG_2])
    })

    it('should return empty array when no packages installed', () => {
      const packages = listDlxPackages()
      expect(packages).toEqual([])
    })

    it('should return empty array when no packages installed asynchronously', async () => {
      const packages = await listDlxPackagesAsync()
      expect(packages).toEqual([])
    })

    it('should return empty array when dlx directory does not exist', async () => {
      await fs.rm(testDlxDir, { recursive: true, force: true })

      const packages = listDlxPackages()
      const packagesAsync = await listDlxPackagesAsync()

      expect(packages).toEqual([])
      expect(packagesAsync).toEqual([])
    })
  })

  describe('removeDlxPackage and removeDlxPackageSync', () => {
    it('should remove package directory', async () => {
      await fs.mkdir(getDlxPackageDir(TEST_PKG), { recursive: true })

      await removeDlxPackage(TEST_PKG)

      expect(isDlxPackageInstalled(TEST_PKG)).toBe(false)
    })

    it('should remove package directory synchronously', async () => {
      const { mkdirSync } = require('node:fs')
      mkdirSync(getDlxPackageDir(TEST_PKG), { recursive: true })

      removeDlxPackageSync(TEST_PKG)

      expect(isDlxPackageInstalled(TEST_PKG)).toBe(false)
    })

    it('should throw error with cause when removal fails', async () => {
      // Try to remove a non-existent package (force: true means it won't error).
      // Instead, try to remove with invalid path characters.
      await expect(removeDlxPackage('\0invalid')).rejects.toThrow(
        /Failed to remove DLX package/,
      )
    })

    it('should throw error with cause when sync removal fails', () => {
      expect(() => removeDlxPackageSync('\0invalid')).toThrow(
        /Failed to remove DLX package/,
      )
    })
  })
})
