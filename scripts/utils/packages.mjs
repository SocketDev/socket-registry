/**
 * @fileoverview Package utilities for checking test status and package metadata.
 */

import { fileURLToPath } from 'node:url'
import fs from 'node:fs'
import path from 'node:path'

import { hasOwn } from '../../registry/dist/lib/objects.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

let _cachedTestNpmPackageJson

/**
 * Get cached test npm package.json.
 */
function getTestNpmPackageJson() {
  if (_cachedTestNpmPackageJson === undefined) {
    const testNpmPackageJsonPath = path.resolve(
      __dirname,
      '../../test/npm/package.json',
    )
    _cachedTestNpmPackageJson = JSON.parse(
      fs.readFileSync(testNpmPackageJsonPath, 'utf8'),
    )
  }
  return _cachedTestNpmPackageJson
}

/**
 * Check if a package should skip tests.
 * @throws {Error} When unable to determine test status.
 */
export function shouldSkipTests(packageName, options) {
  const {
    _ecosystem = 'npm',
    testNpmPackageJson = getTestNpmPackageJson(),
    testPath,
  } = { __proto__: null, ...options }

  // Check if package has test file.
  const testFilePath = path.join(testPath, `${packageName}.test.mts`)
  if (fs.existsSync(testFilePath)) {
    return false
  }

  // Check if package is in test package.json devDependencies.
  if (
    testNpmPackageJson?.devDependencies &&
    hasOwn(testNpmPackageJson.devDependencies, packageName)
  ) {
    return false
  }

  return true
}

/**
 * Get the version spec for a package from test package.json.
 */
export function getPackageVersionSpec(packageName, options) {
  const { testNpmPackageJson = getTestNpmPackageJson() } = {
    __proto__: null,
    ...options,
  }

  return testNpmPackageJson?.devDependencies?.[packageName] || undefined
}
