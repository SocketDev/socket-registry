/**
 * @fileoverview Check script for the registry.
 * Runs all quality checks in parallel:
 * - Linting (via lint command)
 * - TypeScript type checking
 *
 * Usage:
 *   node scripts/check.mjs [options]
 *
 * Options:
 *   --all      Run on all files (default behavior)
 *   --staged   Run on staged files only
 */

import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { getDefaultLogger } from '@socketsecurity/lib/logger'
import { printFooter, printHeader } from '@socketsecurity/lib/stdio/header'

import { runCommand, runParallel } from './utils/run-command.mjs'

const logger = getDefaultLogger()

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootPath = path.resolve(__dirname, '..')
const registryDistPath = path.join(rootPath, 'registry', 'dist', 'index.js')

async function main() {
  try {
    const all = process.argv.includes('--all')
    const staged = process.argv.includes('--staged')
    const help = process.argv.includes('--help') || process.argv.includes('-h')

    if (help) {
      logger.log('Check Runner')
      logger.log('\nUsage: node scripts/check.mjs [options]')
      logger.log('\nOptions:')
      logger.log('  --help, -h     Show this help message')
      logger.log('  --all          Run on all files (default behavior)')
      logger.log('  --staged       Run on staged files only')
      logger.log('\nExamples:')
      logger.log('  node scripts/check.mjs          # Run on all files')
      logger.log(
        '  node scripts/check.mjs --all    # Run on all files (explicit)',
      )
      logger.log('  node scripts/check.mjs --staged # Run on staged files')
      process.exitCode = 0
      return
    }

    printHeader('Running Checks')

    // Build @socketsecurity/registry if not already built.
    // This is required for type checking tests that import from it.
    if (!existsSync(registryDistPath)) {
      const buildExitCode = await runCommand('pnpm', ['run', 'build'])
      if (buildExitCode !== 0) {
        logger.error('Build failed')
        process.exitCode = buildExitCode
        return
      }
    }

    // Delegate to lint command with appropriate flags
    const lintArgs = ['run', 'lint']
    if (all) {
      lintArgs.push('--all')
    } else if (staged) {
      lintArgs.push('--staged')
    }

    const checks = [
      {
        args: lintArgs,
        command: 'pnpm',
        options: {
          ...(process.platform === 'win32' && { shell: true }),
        },
      },
      {
        args: ['exec', 'tsgo', '--noEmit'],
        command: 'pnpm',
        options: {
          ...(process.platform === 'win32' && { shell: true }),
        },
      },
      {
        args: ['scripts/validation/no-link-deps.mjs'],
        command: 'node',
        options: {
          ...(process.platform === 'win32' && { shell: true }),
        },
      },
      {
        args: ['scripts/validation/bundle-deps.mjs'],
        command: 'node',
        options: {
          ...(process.platform === 'win32' && { shell: true }),
        },
      },
      {
        args: ['scripts/validation/esbuild-minify.mjs'],
        command: 'node',
        options: {
          ...(process.platform === 'win32' && { shell: true }),
        },
      },
      {
        args: ['scripts/validation/no-cdn-refs.mjs'],
        command: 'node',
        options: {
          ...(process.platform === 'win32' && { shell: true }),
        },
      },
      {
        args: ['scripts/validation/markdown-filenames.mjs'],
        command: 'node',
        options: {
          ...(process.platform === 'win32' && { shell: true }),
        },
      },
      {
        args: ['scripts/validation/file-size.mjs'],
        command: 'node',
        options: {
          ...(process.platform === 'win32' && { shell: true }),
        },
      },
      {
        args: ['scripts/validation/file-count.mjs'],
        command: 'node',
        options: {
          ...(process.platform === 'win32' && { shell: true }),
        },
      },
    ]

    const exitCodes = await runParallel(checks)
    const failed = exitCodes.some(code => code !== 0)

    if (failed) {
      logger.error('Some checks failed')
      process.exitCode = 1
    } else {
      logger.success('All checks passed')
      printFooter()
    }
  } catch (error) {
    logger.error(`Check failed: ${error.message}`)
    process.exitCode = 1
  }
}

main().catch(e => {
  logger.error(e)
  process.exitCode = 1
})
