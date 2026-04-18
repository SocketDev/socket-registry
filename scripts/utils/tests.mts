/**
 * @fileoverview Test execution coordination and test filtering logic.
 * Provides utilities for determining which tests to run based on changes.
 */

import process from 'node:process'

import { parseArgs } from '@socketsecurity/lib/argv/parse'

let _cliArgs: Record<string, unknown> | undefined

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
 * Check if package testing should be skipped for a given package.
 * Package tests are skipped during pre-commit hooks to speed up commits.
 * They can be forced to run with --force flag or in CI environments.
 */
function isPackageTestingSkipped(_eco: string, _packageName: string) {
  // In pre-commit hooks, skip package tests unless forced.
  if (process.env['PRE_COMMIT'] === 'true') {
    const args = getCliArgs()
    return !(args['force'] || process.env['FORCE_TEST'] === '1')
  }

  // Always run in CI.
  if (process.env['CI'] === 'true') {
    return false
  }

  // Skip by default in regular runs to keep tests fast.
  // Use --force flag to run package tests.
  const args = getCliArgs()
  return !(args['force'] || process.env['FORCE_TEST'] === '1')
}

export { getCliArgs, isPackageTestingSkipped }
