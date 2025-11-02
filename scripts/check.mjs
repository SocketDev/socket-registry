/**
 * @fileoverview Check script for the registry.
 * Runs all quality checks in parallel:
 * - ESLint
 * - TypeScript type checking
 *
 * Usage:
 *   node scripts/check.mjs
 */

import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { getDefaultLogger } from '@socketsecurity/lib/logger'

const logger = getDefaultLogger()

import {
  printError,
  printFooter,
  printHeader,
  printSuccess,
} from './utils/cli-helpers.mjs'
import { runCommand, runParallel } from './utils/run-command.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootPath = path.resolve(__dirname, '..')
const registryDistPath = path.join(rootPath, 'registry', 'dist', 'index.js')

async function main() {
  try {
    printHeader('Running Checks')

    // Build @socketsecurity/registry if not already built.
    // This is required for type checking tests that import from it.
    if (!existsSync(registryDistPath)) {
      const buildExitCode = await runCommand('pnpm', ['run', 'build'])
      if (buildExitCode !== 0) {
        printError('Build failed')
        process.exitCode = buildExitCode
        return
      }
    }

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
        args: ['scripts/validate-no-link-deps.mjs'],
        command: 'node',
        options: {
          ...(process.platform === 'win32' && { shell: true }),
        },
      },
      {
        args: ['scripts/validate-bundle-deps.mjs'],
        command: 'node',
        options: {
          ...(process.platform === 'win32' && { shell: true }),
        },
      },
      {
        args: ['scripts/validate-esbuild-minify.mjs'],
        command: 'node',
        options: {
          ...(process.platform === 'win32' && { shell: true }),
        },
      },
      {
        args: ['scripts/validate-no-cdn-refs.mjs'],
        command: 'node',
        options: {
          ...(process.platform === 'win32' && { shell: true }),
        },
      },
      {
        args: ['scripts/validate-markdown-filenames.mjs'],
        command: 'node',
        options: {
          ...(process.platform === 'win32' && { shell: true }),
        },
      },
      {
        args: ['scripts/validate-file-size.mjs'],
        command: 'node',
        options: {
          ...(process.platform === 'win32' && { shell: true }),
        },
      },
      {
        args: ['scripts/validate-file-count.mjs'],
        command: 'node',
        options: {
          ...(process.platform === 'win32' && { shell: true }),
        },
      },
    ]

    const exitCodes = await runParallel(checks)
    const failed = exitCodes.some(code => code !== 0)

    if (failed) {
      printError('Some checks failed')
      process.exitCode = 1
    } else {
      printSuccess('All checks passed')
      printFooter()
    }
  } catch (error) {
    printError(`Check failed: ${error.message}`)
    process.exitCode = 1
  }
}

main().catch(e => logger.error(e))
