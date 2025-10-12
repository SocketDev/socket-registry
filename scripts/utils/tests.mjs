/**
 * @fileoverview Test execution coordination and test filtering logic.
 * Provides utilities for determining which tests to run based on changes.
 */

import { parseArgs } from '../../registry/dist/lib/argv/parse.js'

let _cliArgs

/**
 * Parse and cache command line arguments.
 */
function getCliArgs() {
  if (_cliArgs === undefined) {
    const { values } = parseArgs({
      options: {
        force: {
          type: 'boolean',
          short: 'f',
        },
        quiet: {
          type: 'boolean',
        },
      },
      strict: false,
    })
    _cliArgs = values
  }
  return _cliArgs
}

/**
 * Check if tests should be skipped for a given test file or module.
 * Tests are always run in CI or when --force flag is present.
 */
function shouldRunTests() {
  const args = getCliArgs()

  // Always run in CI.
  if (process.env.CI === 'true') {
    return true
  }

  // Run if force flag is set.
  if (args.force || process.env.FORCE_TEST === '1') {
    return true
  }

  // Run if not in pre-commit hook.
  if (!process.env.PRE_COMMIT) {
    return true
  }

  // In pre-commit, run tests by default (can be customized later).
  return true
}

/**
 * Check if package testing should be skipped for a given package.
 * Package tests are skipped during pre-commit hooks to speed up commits.
 * They can be forced to run with --force flag or in CI environments.
 *
 * @param {string} _eco - Ecosystem (e.g., "npm")
 * @param {string} _packageName - Package name
 * @returns {boolean} True if package testing should be skipped
 */
function isPackageTestingSkipped(_eco, _packageName) {
  // In pre-commit hooks, skip package tests unless forced.
  if (process.env.PRE_COMMIT === 'true') {
    const args = getCliArgs()
    return !(args.force || process.env.FORCE_TEST === '1')
  }

  // Always run in CI.
  if (process.env.CI === 'true') {
    return false
  }

  // Skip by default in regular runs to keep tests fast.
  // Use --force flag to run package tests.
  const args = getCliArgs()
  return !(args.force || process.env.FORCE_TEST === '1')
}

export { getCliArgs, isPackageTestingSkipped, shouldRunTests }
