/** @fileoverview Shared test utilities for npm package testing. */

import path from 'node:path'

import { installPackageForTesting } from '../../scripts/utils/package.mjs'

/**
 * Creates a test setup function for npm package tests.
 * @param {string} sockRegPkgName - Socket registry package name.
 * @returns {Promise<{pkgPath: string}>}
 */
async function setupPackageTest(sockRegPkgName) {
  const result = await installPackageForTesting(sockRegPkgName)
  if (!result.installed) {
    throw new Error(`Failed to install package: ${result.reason}`)
  }
  return {
    pkgPath: result.packagePath,
  }
}

/**
 * Common test helper for packages that require multiple entry points.
 * @param {string} sockRegPkgName - Socket registry package name.
 * @param {string[]} entryPoints - Array of entry point filenames.
 * @returns {Promise<{pkgPath: string, modules: any[]}>}
 */
async function setupMultiEntryTest(sockRegPkgName, entryPoints) {
  const { pkgPath } = await setupPackageTest(sockRegPkgName)
  const modules = entryPoints.map(entryPoint =>
    require(path.join(pkgPath, entryPoint)),
  )
  return {
    pkgPath,
    modules,
  }
}

export { setupMultiEntryTest, setupPackageTest }
