/**
 * @fileoverview Shared test utilities for npm package testing.
 * Provides helpers for setting up isolated test environments.
 */

import { existsSync } from 'node:fs'
import path from 'node:path'

import constants from '../../scripts/constants.mjs'
import {
  readPackageJson,
  isolatePackage as registryIsolatePackage,
  resolveOriginalPackageName,
} from '../../registry/dist/lib/packages.js'
import { cleanTestScript } from './script-cleaning.mjs'
import { testRunners } from './test-runners.mjs'

/**
 * Isolates a package in a temporary test environment.
 *
 * Supports multiple input types:
 * 1. Socket registry packages: Pass package name (e.g., '@socketregistry/packageurl-js')
 * 2. Local development packages: Pass relative or absolute path (e.g., '../../socket-packageurl-js' or '.')
 * 3. npm package specs: Pass any npm-package-arg compatible spec
 *
 * @param {string} packageSpec - Package name, path, or npm package spec.
 * @param {object} [options] - Optional configuration.
 * @param {Record<string, string>} [options.imports] - Map of import names to module specifiers (e.g., { PackageURL: './package-url.js' }).
 * @returns {Promise<{exports?: Record<string, any>, tmpdir: string}>}
 *
 * @example
 * const { tmpdir } = await isolatePackage('@socketregistry/packageurl-js')
 *
 * @example
 * const { tmpdir } = await isolatePackage('../../socket-packageurl-js')
 *
 * @example
 * const { tmpdir, exports } = await isolatePackage('packageurl-js@1.0.0', {
 *   imports: { PackageURL: './package-url.js', convert: './url-converter.js' }
 * })
 * // exports.PackageURL, exports.convert
 */
async function isolatePackage(packageSpec, options = {}) {
  const { imports } = options

  let resolvedSpec = packageSpec
  let sourcePath
  let hasSourcePath = false

  // Check if this is a Socket registry package.
  if (
    packageSpec.startsWith('@socketregistry/') &&
    !packageSpec.includes('@', 1)
  ) {
    const socketPkgName = packageSpec
    sourcePath = path.join(constants.npmPackagesPath, socketPkgName)

    if (!existsSync(sourcePath)) {
      throw new Error(`No Socket override found for ${socketPkgName}`)
    }

    // Resolve to original npm package name.
    const packageName = resolveOriginalPackageName(socketPkgName)

    // Get version spec from test/npm/package.json.
    const testPkgJson = await readPackageJson(constants.testNpmPkgJsonPath, {
      normalize: true,
    })
    const spec = testPkgJson.devDependencies?.[packageName]

    if (!spec) {
      throw new Error(`${packageName} not in devDependencies`)
    }

    resolvedSpec = `${packageName}@${spec}`
    hasSourcePath = true
  }

  const result = await registryIsolatePackage(resolvedSpec, {
    imports,
    onPackageJson: async pkgJson => {
      // Preserve test scripts for registry packages.
      if (hasSourcePath) {
        const originalScripts = pkgJson.scripts

        if (originalScripts) {
          pkgJson.scripts = pkgJson.scripts || {}

          const additionalTestRunners = [
            ...testRunners,
            'test:stock',
            'test:all',
          ]
          let actualTestScript = additionalTestRunners.find(
            runner => originalScripts[runner],
          )

          if (!actualTestScript && originalScripts.test) {
            const testMatch = originalScripts.test.match(/npm run ([-:\w]+)/)
            if (testMatch && originalScripts[testMatch[1]]) {
              actualTestScript = testMatch[1]
            }
          }

          if (actualTestScript && originalScripts[actualTestScript]) {
            pkgJson.scripts.test = cleanTestScript(
              originalScripts[actualTestScript],
            )
            if (actualTestScript !== 'test') {
              pkgJson.scripts[actualTestScript] = cleanTestScript(
                originalScripts[actualTestScript],
              )
            }
          } else if (originalScripts.test) {
            pkgJson.scripts.test = cleanTestScript(originalScripts.test)
          }

          for (const { 0: key, 1: value } of Object.entries(originalScripts)) {
            if (
              (key.startsWith('test:') || key.startsWith('tests')) &&
              !pkgJson.scripts[key]
            ) {
              pkgJson.scripts[key] = cleanTestScript(value)
            }
          }
        }
      }

      return pkgJson
    },
    sourcePath,
  })

  return result
}

export { isolatePackage }
