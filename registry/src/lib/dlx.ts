/** @fileoverview DLX (execute package) utilities for Socket ecosystem shared installations. */

import { existsSync, promises as fs } from 'node:fs'
import path from 'node:path'

import { readDirNamesSync, remove } from './fs'
import { normalizePath } from './path'
import { getSocketDlxDir } from './paths'

/**
 * Clear all DLX package installations.
 */
export async function clearDlx(): Promise<void> {
  const packages = await listDlxPackagesAsync()
  await Promise.all(packages.map(pkg => removeDlxPackage(pkg)))
}

/**
 * Clear all DLX package installations synchronously.
 */
export function clearDlxSync(): void {
  const packages = listDlxPackages()
  for (const pkg of packages) {
    removeDlxPackageSync(pkg)
  }
}

/**
 * Check if the DLX directory exists.
 */
export function dlxDirExists(): boolean {
  return existsSync(getSocketDlxDir())
}

/**
 * Check if the DLX directory exists asynchronously.
 */
export async function dlxDirExistsAsync(): Promise<boolean> {
  try {
    await fs.access(getSocketDlxDir())
    return true
  } catch {
    return false
  }
}

/**
 * Ensure the DLX directory exists, creating it if necessary.
 */
export async function ensureDlxDir(): Promise<void> {
  await fs.mkdir(getSocketDlxDir(), { recursive: true })
}

/**
 * Ensure the DLX directory exists synchronously, creating it if necessary.
 */
export function ensureDlxDirSync(): void {
  const { mkdirSync } = require('node:fs')
  mkdirSync(getSocketDlxDir(), { recursive: true })
}

/**
 * Get the installed package directory within DLX node_modules.
 */
export function getDlxInstalledPackageDir(packageName: string): string {
  return normalizePath(
    path.join(getDlxPackageNodeModulesDir(packageName), packageName),
  )
}

/**
 * Get the DLX installation directory for a specific package.
 */
export function getDlxPackageDir(packageName: string): string {
  return normalizePath(path.join(getSocketDlxDir(), packageName))
}

/**
 * Get the package.json path for a DLX installed package.
 */
export function getDlxPackageJsonPath(packageName: string): string {
  return normalizePath(
    path.join(getDlxInstalledPackageDir(packageName), 'package.json'),
  )
}

/**
 * Get the node_modules directory for a DLX package installation.
 */
export function getDlxPackageNodeModulesDir(packageName: string): string {
  return normalizePath(path.join(getDlxPackageDir(packageName), 'node_modules'))
}

/**
 * Check if a package is installed in DLX.
 */
export function isDlxPackageInstalled(packageName: string): boolean {
  return existsSync(getDlxInstalledPackageDir(packageName))
}

/**
 * Check if a package is installed in DLX asynchronously.
 */
export async function isDlxPackageInstalledAsync(
  packageName: string,
): Promise<boolean> {
  try {
    await fs.access(getDlxInstalledPackageDir(packageName))
    return true
  } catch {
    return false
  }
}

/**
 * List all packages installed in DLX.
 */
export function listDlxPackages(): string[] {
  try {
    return readDirNamesSync(getSocketDlxDir(), { sort: true })
  } catch {
    return []
  }
}

/**
 * List all packages installed in DLX asynchronously.
 */
export async function listDlxPackagesAsync(): Promise<string[]> {
  try {
    const entries = await fs.readdir(getSocketDlxDir(), {
      withFileTypes: true,
    })
    return entries
      .filter(e => e.isDirectory())
      .map(e => e.name)
      .sort()
  } catch {
    return []
  }
}

/**
 * Remove a DLX package installation.
 */
export async function removeDlxPackage(packageName: string): Promise<void> {
  const packageDir = getDlxPackageDir(packageName)
  try {
    await remove(packageDir, { recursive: true, force: true })
  } catch (e) {
    throw new Error(`Failed to remove DLX package "${packageName}"`, {
      cause: e,
    })
  }
}

/**
 * Remove a DLX package installation synchronously.
 */
export function removeDlxPackageSync(packageName: string): void {
  const { rmSync } = require('node:fs')
  const packageDir = getDlxPackageDir(packageName)
  try {
    rmSync(packageDir, { recursive: true, force: true })
  } catch (e) {
    throw new Error(`Failed to remove DLX package "${packageName}"`, {
      cause: e,
    })
  }
}
