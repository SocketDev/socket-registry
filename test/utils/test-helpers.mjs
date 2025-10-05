/**
 * @fileoverview Shared test utilities for npm package testing.
 * Provides helpers for setting up isolated test environments for both
 * socket-registry packages and local development packages.
 */

import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import constants from '../../scripts/constants.mjs'
import { installPackageForTesting } from '../../scripts/utils/package.mjs'
import {
  readPackageJson,
  resolveOriginalPackageName,
} from '../../registry/dist/lib/packages.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Isolates a package in a temporary test environment.
 *
 * Supports two modes:
 * 1. Socket registry packages: Pass package name (e.g., '@socketregistry/packageurl-js')
 * 2. Local development packages: Pass relative or absolute path (e.g., '../../socket-packageurl-js' or '.')
 *
 * The helper creates an isolated test environment by:
 * - Installing the package in a temporary directory
 * - Copying package files to node_modules
 * - Installing dependencies
 * - Preserving test scripts (for registry packages)
 *
 * @param {string} packageOrPath - Package name or local path to package directory.
 * @param {object} [options] - Optional configuration.
 * @param {string[]} [options.entryPoints] - Array of entry point filenames to load.
 * @returns {Promise<{pkgPath: string, modules?: any[]}>}
 *
 * @example
 * // Test a socket-registry package
 * const { pkgPath } = await isolatePackage('@socketregistry/packageurl-js')
 *
 * @example
 * // Test a local development package
 * const { pkgPath } = await isolatePackage('../../socket-packageurl-js')
 *
 * @example
 * // Load multiple entry points
 * const { pkgPath, modules } = await isolatePackage('../../socket-packageurl-js', {
 *   entryPoints: ['package-url.js', 'url-converter.js']
 * })
 */
async function isolatePackage(packageOrPath, options = {}) {
  const { entryPoints } = options

  // Determine if this is a path or package name
  const isPath = packageOrPath.startsWith('.') || path.isAbsolute(packageOrPath)

  let sourcePath
  let packageName
  let versionSpec

  if (isPath) {
    // Local development package
    sourcePath = path.resolve(__dirname, '..', '..', packageOrPath)

    // Read package.json to get the name
    const pkgJson = await readPackageJson(sourcePath, { normalize: true })
    packageName = pkgJson.name
  } else {
    // Socket registry package
    const socketPkgName = packageOrPath
    sourcePath = path.join(constants.npmPackagesPath, socketPkgName)

    if (!existsSync(sourcePath)) {
      throw new Error(`No Socket override found for ${socketPkgName}`)
    }

    // Resolve to original npm package name
    packageName = resolveOriginalPackageName(socketPkgName)

    // Get version spec from test/npm/package.json
    const testPkgJson = await readPackageJson(constants.testNpmPkgJsonPath, {
      normalize: true,
    })
    versionSpec = testPkgJson.devDependencies?.[packageName]

    if (!versionSpec) {
      throw new Error(`${packageName} not in devDependencies`)
    }
  }

  const result = await installPackageForTesting(sourcePath, packageName, {
    versionSpec,
  })

  if (!result.installed) {
    throw new Error(`Failed to install package: ${result.reason}`)
  }

  const pkgPath = result.packagePath

  if (entryPoints && entryPoints.length > 0) {
    const modules = entryPoints.map(entryPoint =>
      require(path.join(pkgPath, entryPoint)),
    )
    return { pkgPath, modules }
  }

  return { pkgPath }
}

export { isolatePackage }
