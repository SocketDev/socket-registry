/**
 * @file Package utilities for checking test status and package metadata.
 */

import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

import { hasOwn } from '@socketsecurity/lib-stable/objects/predicates'

import { PACKAGE_JSON, TEST_NPM_PATH } from '../../constants/paths.mts'

type TestNpmPackageJson = {
  devDependencies?: Record<string, string> | undefined
}

let cachedTestNpmPackageJson: TestNpmPackageJson | undefined

/**
 * Get cached test npm package.json.
 */
export function getTestNpmPackageJson() {
  if (cachedTestNpmPackageJson === undefined) {
    // Resolved from the canonical path constants — the old __dirname-relative
    // hop ('../../') broke when this util moved under scripts/repo/util/.
    const testNpmPackageJsonPath = path.join(TEST_NPM_PATH, PACKAGE_JSON)
    cachedTestNpmPackageJson = JSON.parse(
      readFileSync(testNpmPackageJsonPath, 'utf8'),
    )
  }
  return cachedTestNpmPackageJson
}

/**
 * Get the version spec for a package from test package.json.
 */
export function getPackageVersionSpec(
  packageName: string,
  options: { testNpmPackageJson?: TestNpmPackageJson | undefined } = {},
) {
  const opts = { __proto__: null, ...options }
  const { testNpmPackageJson = getTestNpmPackageJson() } = opts

  return testNpmPackageJson?.devDependencies?.[packageName] || undefined
}

/**
 * Check if a package should skip tests.
 *
 * @throws {Error} When unable to determine test status.
 */
export function shouldSkipTests(
  packageName: string,
  options: {
    testNpmPackageJson?: TestNpmPackageJson | undefined
    testPath: string
  },
) {
  const opts = { __proto__: null, ...options }
  const { testNpmPackageJson = getTestNpmPackageJson(), testPath } = opts

  // Check if package has test file.
  const testFilePath = path.join(testPath, `${packageName}.test.mts`)
  if (existsSync(testFilePath)) {
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
