/**
 * @fileoverview Build script for the registry.
 * Builds the registry package.
 *
 * Usage:
 *   node scripts/build.mjs
 */

import {
  printError,
  printFooter,
  printHeader,
  printSuccess,
} from './utils/cli-helpers.mjs'
import { runParallel } from './utils/run-command.mjs'

// Note: We use the shared print utilities instead of the registry logger
// because the logger is in registry/dist/lib/logger.js which doesn't exist until
// after the build completes. This script must work on fresh clones before any
// build artifacts exist.
async function main() {
  try {
    printHeader('Building Registry')

    const builds = [
      {
        args: ['--filter', 'registry', 'run', 'build'],
        command: 'pnpm',
      },
    ]

    const exitCodes = await runParallel(builds)
    const failed = exitCodes.some(code => code !== 0)

    if (failed) {
      printError('Build failed')
      process.exitCode = 1
    } else {
      printSuccess('Build complete')
      printFooter()
    }
  } catch (error) {
    printError(`Build failed: ${error.message}`)
    process.exitCode = 1
  }
}

main().catch(console.error)
