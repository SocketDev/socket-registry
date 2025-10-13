/**
 * @fileoverview Unified linting script for the Socket Registry project.
 * Runs eslint, biome, and oxlint based on configuration flags.
 */

import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'

import colors from 'yoctocolors-cjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootPath = path.join(__dirname, '..')

// Parse command line arguments
const { values } = parseArgs({
  options: {
    all: { type: 'boolean' },
    fix: { type: 'boolean' },
    staged: { type: 'boolean' },
    quiet: { type: 'boolean' },
  },
})

const { all = false, fix = false, quiet = false, staged = false } = values

// Run command helper
async function run(command, args = []) {
  return new Promise(resolve => {
    const child = spawn(command, args, {
      stdio: quiet ? 'pipe' : 'inherit',
      shell: process.platform === 'win32',
      cwd: rootPath,
    })

    child.on('close', code => resolve(code || 0))
    child.on('error', () => resolve(1))
  })
}

// Main lint function
async function lint() {
  if (!quiet) {
    console.log(
      `${colors.cyan('Linting')} ${all ? 'all files' : staged ? 'staged files' : 'changed files'}...`,
    )
  }

  let hasError = false

  // Determine what to lint
  const affectedScript = path.join(__dirname, 'lint-affected.mjs')

  // Run lint-affected for targeted linting
  if (!all && existsSync(affectedScript)) {
    const args = ['node', affectedScript]
    if (staged) {
      args.push('--staged')
    }
    if (fix) {
      args.push('--fix')
    }

    const code = await run(args[0], args.slice(1))
    if (code !== 0) {
      hasError = true
    }
  } else {
    // Run all linters
    const linters = [
      {
        name: 'ESLint',
        command: 'pnpm',
        args: [
          'exec',
          'eslint',
          '--config',
          '.config/eslint.config.mjs',
          '--report-unused-disable-directives',
          ...(fix ? ['--fix'] : []),
          '.',
        ],
      },
      {
        name: 'Biome',
        command: 'pnpm',
        args: [
          'exec',
          'biome',
          fix ? 'format' : 'check',
          '--config',
          '.config/biome.json',
          '.',
        ],
      },
      {
        name: 'Oxlint',
        command: 'pnpm',
        args: ['exec', 'oxlint', ...(fix ? ['--fix'] : []), '.'],
      },
    ]

    for (const { args, command, name } of linters) {
      if (!quiet) {
        console.log(`  Running ${name}...`)
      }

      const code = await run(command, args)
      if (code !== 0) {
        hasError = true
      }
    }
  }

  if (!quiet) {
    if (hasError) {
      console.log(`\n${colors.red('✗')} Linting failed`)
    } else {
      console.log(`\n${colors.green('✓')} Linting passed`)
    }
  }

  process.exitCode = hasError ? 1 : 0
}

lint().catch(console.error)
