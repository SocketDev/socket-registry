/**
 * @fileoverview Build script for the registry.
 * Builds the registry package.
 *
 * Usage:
 *   node scripts/build.mjs
 */

import { printFooter, printHeader } from './utils/cli-helpers.mjs'
import { runWithOutput } from './utils/interactive-runner.mjs'

// Note: We use the shared print utilities instead of the registry logger
// because the logger is in registry/dist/lib/logger.js which doesn't exist until
// after the build completes. This script must work on fresh clones before any
// build artifacts exist.
async function main() {
  try {
    printHeader('Building Registry')

    const exitCode = await runWithOutput(
      'pnpm',
      ['--filter', 'registry', 'run', 'build'],
      {
        message: 'Building',
        toggleText: 'to see build output',
      },
    )

    if (exitCode !== 0) {
      process.exitCode = 1
    } else {
      printFooter()
    }
  } catch (error) {
    console.error(`Build failed: ${error.message}`)
    process.exitCode = 1
  }
}

main().catch(console.error)
