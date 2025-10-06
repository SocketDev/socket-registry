/**
 * @fileoverview Build script for the registry.
 * Builds the registry package.
 *
 * Usage:
 *   node scripts/build.mjs
 */

import { logger } from '../registry/dist/lib/logger.js'
import { runParallel } from './utils/run-command.mjs'

async function main() {
  try {
    logger.log('Building registry...')

    const builds = [
      {
        args: ['--filter', 'registry', 'run', 'build'],
        command: 'pnpm',
      },
    ]

    const exitCodes = await runParallel(builds)
    const failed = exitCodes.some(code => code !== 0)

    if (failed) {
      logger.error('Build failed')
      process.exitCode = 1
    } else {
      logger.log('Build complete')
    }
  } catch (error) {
    logger.error('Build failed:', error.message)
    process.exitCode = 1
  }
}

main()
