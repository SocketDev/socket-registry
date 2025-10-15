/**
 * @fileoverview Lint script for external dependencies in the registry.
 * Runs eslint on dist/external without auto-fix.
 *
 * Usage:
 *   node scripts/lint-external.mjs
 */

import { runCommand } from '../../scripts/utils/run-command.mjs'
import { logger } from './utils/helpers.mjs'

async function main() {
  try {
    logger.info('Linting external dependencies...')

    const exitCode = await runCommand(
      'eslint',
      [
        '--config',
        '../.config/eslint.config.mjs',
        '--report-unused-disable-directives',
        './dist/external',
      ],
      {
        env: {
          ...process.env,
          LINT_EXTERNAL: '1',
        },
      },
    )

    if (exitCode !== 0) {
      logger.error('External dependency linting failed')
      process.exitCode = exitCode
    } else {
      logger.log('External dependency linting complete')
    }
  } catch (error) {
    logger.error('Lint external failed:', error.message)
    process.exitCode = 1
  }
}

main().catch(console.error)
