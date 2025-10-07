/**
 * @fileoverview Lint script for external dependencies in the registry.
 * Runs oxlint on dist/external without auto-fix.
 *
 * Usage:
 *   node scripts/lint-external.mjs
 */

import { logger } from '../dist/lib/logger.js'
import { runCommand } from '../../scripts/utils/run-command.mjs'

async function main() {
  try {
    logger.log('Linting external dependencies...')

    const exitCode = await runCommand(
      'oxlint',
      [
        '-c=../.config/oxlintrc.json',
        '--ignore-path=../.config/.oxlintignore',
        '--tsconfig=../tsconfig.json',
        '--silent',
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

main()
