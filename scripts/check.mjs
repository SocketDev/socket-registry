/**
 * @fileoverview Check script for the registry.
 * Runs all quality checks in parallel:
 * - ESLint
 * - TypeScript type checking
 *
 * Usage:
 *   node scripts/check.mjs
 */

import {
  printError,
  printFooter,
  printHeader,
  printSuccess,
} from './utils/cli-helpers.mjs'
import { runParallel } from './utils/run-command.mjs'

async function main() {
  try {
    printHeader('Running Checks')

    const checks = [
      {
        args: [
          'exec',
          'eslint',
          '--config',
          '.config/eslint.config.mjs',
          '--report-unused-disable-directives',
          '.',
        ],
        command: 'pnpm',
      },
      {
        args: ['exec', 'tsgo', '--noEmit'],
        command: 'pnpm',
      },
    ]

    const exitCodes = await runParallel(checks)
    const failed = exitCodes.some(code => code !== 0)

    if (failed) {
      printError('Some checks failed')
      process.exitCode = 1
    } else {
      printSuccess('All checks passed')
      printFooter()
    }
  } catch (error) {
    printError(`Check failed: ${error.message}`)
    process.exitCode = 1
  }
}

main().catch(console.error)
