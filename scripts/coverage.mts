/**
 * @fileoverview Coverage script for the registry.
 * Collects both code coverage and type coverage.
 *
 * Usage:
 *   node scripts/coverage.mts [--code-only|--type-only|--percent]
 */

import { parseArgs } from 'node:util'

import { runSequence } from './utils/run-command.mjs'
import { logger } from '../registry/dist/lib/logger.js'

async function main() {
  try {
    const { values } = parseArgs({
      options: {
        'code-only': { type: 'boolean', default: false },
        percent: { type: 'boolean', default: false },
        'type-only': { type: 'boolean', default: false },
      },
      strict: false,
    })

    if (values.percent) {
      // Just get coverage percentage
      const exitCode = await runSequence([
        { args: ['scripts/get-coverage-percentage.mjs'], command: 'node' },
      ])
      process.exitCode = exitCode
      return
    }

    if (values['type-only']) {
      logger.log('Collecting type coverage...')
      const exitCode = await runSequence([
        { args: [], command: 'type-coverage' },
      ])
      process.exitCode = exitCode
      return
    }

    if (values['code-only']) {
      logger.log('Collecting code coverage...')
      const exitCode = await runSequence([
        {
          args: ['run', 'coverage:test'],
          command: 'pnpm',
        },
      ])
      process.exitCode = exitCode
      return
    }

    // Collect both code and type coverage
    logger.log('Collecting coverage (code + type)...')

    const codeExitCode = await runSequence([
      {
        args: ['run', 'coverage:test'],
        command: 'pnpm',
      },
    ])

    if (codeExitCode !== 0) {
      process.exitCode = codeExitCode
      return
    }

    const typeExitCode = await runSequence([
      { args: [], command: 'type-coverage' },
    ])

    process.exitCode = typeExitCode
  } catch (e) {
    const error = e instanceof Error ? e : new Error(String(e))
    logger.error('Coverage collection failed:', error.message)
    process.exitCode = 1
  }
}

main().catch(console.error)
