/**
 * @fileoverview Fix script for external dependencies in the registry.
 * Runs biome and oxlint with auto-fix enabled on dist/external.
 *
 * Usage:
 *   node scripts/fix-external.mjs
 */

import { logger } from '../dist/lib/logger.js'
import { runCommandQuiet } from '../../scripts/utils/run-command.mjs'

async function main() {
  try {
    logger.log('Running linters on external dependencies with auto-fix...')

    const linters = [
      {
        args: [
          'biome',
          'format',
          '--log-level=none',
          '--fix',
          './dist/external',
        ],
        name: 'biome',
      },
      {
        args: [
          'oxlint',
          '-c=../.config/oxlintrc.json',
          '--ignore-path=../.config/.oxlintignore',
          '--tsconfig=../tsconfig.json',
          '--silent',
          '--fix',
          './dist/external',
        ],
        name: 'oxlint',
      },
    ]

    let hadError = false

    // Run linters in parallel for faster execution.
    const results = await Promise.all(
      linters.map(async ({ args, name }) => {
        logger.log(`  - Running ${name}...`)
        const result = await runCommandQuiet(args[0], args.slice(1), {
          env: {
            ...process.env,
            LINT_EXTERNAL: '1',
          },
        })
        return { name, result }
      }),
    )

    // Check results.
    for (const { name, result } of results) {
      // These linters can exit with non-zero when they make fixes.
      // So we don't treat that as an error.
      if (result.exitCode !== 0) {
        // Log stderr only if there's actual error content.
        if (result.stderr && result.stderr.trim().length > 0) {
          logger.error(`${name} errors:`, result.stderr)
          hadError = true
        }
      }
    }

    if (hadError) {
      process.exitCode = 1
    } else {
      logger.log('External dependency lint fixes complete')
    }
  } catch (error) {
    logger.error('Fix external failed:', error.message)
    process.exitCode = 1
  }
}

main().catch(console.error)
