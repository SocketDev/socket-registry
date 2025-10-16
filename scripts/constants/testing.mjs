/**
 * @fileoverview Testing-related constants and utilities.
 */

import fs from 'node:fs'
import { WIN32 } from './node.mjs'
import {
  NPM_PACKAGES_PATH,
  ROOT_PACKAGES_PATH,
  TEST_NPM_PATH,
} from './paths.mjs'

/**
 * Get npm package names from packages directory.
 */
export function getNpmPackageNames() {
  return fs
    .readdirSync(NPM_PACKAGES_PATH, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory() && !dirent.name.startsWith('.'))
    .map(dirent => dirent.name)
}

/**
 * Get available package ecosystems.
 */
export function getEcosystems() {
  return fs.readdirSync(ROOT_PACKAGES_PATH)
}

/**
 * Get map of tests to skip by ecosystem.
 */
export function getSkipTestsByEcosystem() {
  // Get all test files from test/npm directory.
  const testFiles = fs
    .readdirSync(TEST_NPM_PATH)
    .filter(name => name.endsWith('.test.mts'))
    .map(name => name.slice(0, -'.test.mts'.length))

  const skipSet = new Set([
    // date tests fail for some Node versions and platforms, but pass in CI
    // Win32 environments for the time being.
    // https://github.com/es-shims/Date/issues/3
    // https://github.com/es-shims/Date/tree/v2.0.5
    ...(WIN32 ? [] : ['date']),
    // Dynamically include all packages with test files in test/npm.
    ...testFiles,
  ])

  return new Map([['npm', skipSet]])
}

/**
 * Get map of tests that must run on Win32 by ecosystem.
 */
export function getWin32EnsureTestsByEcosystem() {
  return new Map([['npm', new Set(['date'])]])
}

/**
 * Map of packages allowed to fail tests by ecosystem.
 */
export const ALLOW_TEST_FAILURES_BY_ECOSYSTEM = new Map([
  [
    'npm',
    new Set([
      // es-get-iterator installation fails intermittently in CI environments.
      'es-get-iterator',
      // function.prototype.name installation fails intermittently in CI environments.
      'function.prototype.name',
      // is-boolean-object installation fails intermittently in CI environments.
      'is-boolean-object',
      // object.assign installation fails intermittently in CI environments.
      'object.assign',
    ]),
  ],
])
