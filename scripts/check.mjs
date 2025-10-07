/**
 * @fileoverview Check script for the registry.
 * Runs all quality checks in parallel:
 * - ESLint
 * - TypeScript type checking
 *
 * Usage:
 *   node scripts/check.mjs
 */

import { logger } from '../registry/dist/lib/logger.js'
import { runParallel } from './utils/run-command.mjs'

async function main() {
  try {
    logger.log('Running checks...')

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
      logger.error('Some checks failed')
      process.exitCode = 1
    } else {
      logger.log('All checks passed')
    }
  } catch (error) {
    logger.error('Check failed:', error.message)
    process.exitCode = 1
  }
}

main().catch(console.error)
