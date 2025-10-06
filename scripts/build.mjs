/**
 * @fileoverview Build script for the registry.
 * Builds the registry package.
 *
 * Usage:
 *   node scripts/build.mjs
 */

import { runParallel } from './utils/run-command.mjs'

// Note: We use console methods directly instead of importing the registry logger
// because the logger is in registry/dist/lib/logger.js which doesn't exist until
// after the build completes. This script must work on fresh clones before any
// build artifacts exist.
async function main() {
  try {
    console.log('Building registry...')

    const builds = [
      {
        args: ['--filter', 'registry', 'run', 'build'],
        command: 'pnpm',
      },
    ]

    const exitCodes = await runParallel(builds)
    const failed = exitCodes.some(code => code !== 0)

    if (failed) {
      console.error('Build failed')
      process.exitCode = 1
    } else {
      console.log('Build complete')
    }
  } catch (error) {
    console.error('Build failed:', error.message)
    process.exitCode = 1
  }
}

main()
