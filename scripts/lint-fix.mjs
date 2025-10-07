/**
 * @fileoverview Lint fix script for the registry.
 * Runs all linters in sequence with auto-fix enabled:
 * 1. oxlint - Fast Rust-based linter
 * 2. biome - Fast formatter
 * 3. eslint - Final linting pass
 *
 * Usage:
 *   node scripts/lint-fix.mjs
 */

import { logger } from '../registry/dist/lib/logger.js'
import { runCommandQuiet } from './utils/run-command.mjs'

async function main() {
  try {
    logger.log('Running linters with auto-fix...')

    const linters = [
      {
        args: [
          'oxlint',
          '-c=.config/oxlintrc.json',
          '--ignore-path=.config/.oxlintignore',
          '--tsconfig=tsconfig.json',
          '--quiet',
          '--fix',
          '.',
        ],
        name: 'oxlint',
      },
      {
        args: ['biome', 'format', '--log-level=none', '--fix', '.'],
        name: 'biome',
      },
      {
        args: [
          'eslint',
          '--config',
          '.config/eslint.config.mjs',
          '--report-unused-disable-directives',
          '--fix',
          '.',
        ],
        name: 'eslint',
      },
    ]

    let hadError = false

    for (const { args, name } of linters) {
      logger.log(`  - Running ${name}...`)
      // eslint-disable-next-line no-await-in-loop
      const result = await runCommandQuiet(args[0], args.slice(1))

      // These linters can exit with non-zero when they make fixes
      // So we don't treat that as an error
      if (result.exitCode !== 0) {
        // Log stderr only if there's actual error content
        if (result.stderr && result.stderr.trim().length > 0) {
          logger.error(`${name} errors:`, result.stderr)
          hadError = true
        }
      }
    }

    if (hadError) {
      process.exitCode = 1
    } else {
      logger.log('Lint fixes complete')
    }
  } catch (error) {
    logger.error('Lint fix failed:', error.message)
    process.exitCode = 1
  }
}

main().catch(console.error)
