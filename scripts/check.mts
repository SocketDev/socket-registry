/**
 * @fileoverview Check script for the registry.
 * Runs all quality checks in parallel:
 * - Linting (via lint command)
 * - TypeScript type checking
 *
 * Usage:
 *   node scripts/check.mts [options]
 *
 * Options:
 *   --all      Run on all files (default behavior)
 *   --staged   Run on staged files only
 */

import { existsSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { WIN32 } from '@socketsecurity/lib/constants/platform'
import { getDefaultLogger } from '@socketsecurity/lib/logger'
import { printFooter } from '@socketsecurity/lib/stdio/footer'
import { printHeader } from '@socketsecurity/lib/stdio/header'

import {
  runCommand,
  runCommandQuiet,
  runParallel,
} from './util/run-command.mts'

const logger = getDefaultLogger()

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootPath = path.resolve(__dirname, '..')
const registryDistPath = path.join(rootPath, 'registry', 'dist', 'index.js')

export async function runTypeCheck(quiet = false): Promise<number> {
  if (!quiet) {
    logger.progress('Checking TypeScript')
  }
  const result = await runCommandQuiet('tsgo', [
    '--noEmit',
    '-p',
    'tsconfig.check.json',
  ])
  if (result.exitCode !== 0) {
    if (!quiet) {
      logger.error('Type checks failed')
    }
    if (result.stdout) {
      logger.log(result.stdout)
    }
    return result.exitCode
  }
  if (!quiet) {
    logger.clearLine().done('Type checks passed')
  }
  return 0
}

async function main(): Promise<void> {
  try {
    const all = process.argv.includes('--all')
    const quiet = process.argv.includes('--quiet')
    const staged = process.argv.includes('--staged')
    const help = process.argv.includes('--help') || process.argv.includes('-h')

    if (help) {
      logger.log('Check Runner')
      logger.log('\nUsage: node scripts/check.mts [options]')
      logger.log('\nOptions:')
      logger.log('  --help, -h     Show this help message')
      logger.log('  --all          Run on all files (default behavior)')
      logger.log('  --staged       Run on staged files only')
      logger.log('\nExamples:')
      logger.log('  node scripts/check.mts          # Run on all files')
      logger.log(
        '  node scripts/check.mts --all    # Run on all files (explicit)',
      )
      logger.log('  node scripts/check.mts --staged # Run on staged files')
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
          shell: WIN32,
        },
      },
      {
        args: ['scripts/validation/no-link-deps.mts'],
        command: 'node',
        options: {
          shell: WIN32,
        },
      },
      {
        args: ['scripts/validation/bundle-deps.mts'],
        command: 'node',
        options: {
          shell: WIN32,
        },
      },
      {
        args: ['scripts/validation/esbuild-minify.mts'],
        command: 'node',
        options: {
          shell: WIN32,
        },
      },
      {
        args: ['scripts/validation/no-cdn-refs.mts'],
        command: 'node',
        options: {
          shell: WIN32,
        },
      },
      {
        args: ['scripts/validation/markdown-filenames.mts'],
        command: 'node',
        options: {
          shell: WIN32,
        },
      },
      {
        args: ['scripts/validation/file-size.mts'],
        command: 'node',
        options: {
          shell: WIN32,
        },
      },
      {
        args: ['scripts/validation/file-count.mts'],
        command: 'node',
        options: {
          shell: WIN32,
        },
      },
      // Path-hygiene gate (1 path, 1 reference). See
      // .claude/skills/path-guard/ + .claude/hooks/path-guard/.
      {
        args: ['scripts/check-paths.mts', '--quiet'],
        command: 'node',
        options: {
          shell: WIN32,
        },
      },
    ]

    const exitCodes = await runParallel(checks)
    const failed = exitCodes.some(code => code !== 0)

    if (failed) {
      logger.error('Some checks failed')
      process.exitCode = 1
      return
    }

    const typeCheckExitCode = await runTypeCheck(quiet)
    if (typeCheckExitCode !== 0) {
      process.exitCode = typeCheckExitCode
      return
    }

    logger.success('All checks passed')
    printFooter()
  } catch (e) {
    logger.error(`Check failed: ${(e as Error).message}`)
    process.exitCode = 1
  }
}

main().catch((e: unknown) => {
  logger.error(e)
  process.exitCode = 1
})
