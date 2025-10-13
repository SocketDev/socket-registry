/**
 * @fileoverview Unified test runner that provides a smooth, single-script experience.
 * Combines check, build, and test steps with clean, consistent output.
 */

import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { parseArgs } from 'node:util'

import fastGlob from 'fast-glob'

import { logger } from '../registry/dist/lib/logger.js'
import { onExit } from '../registry/dist/lib/signal-exit.js'
import { spinner } from '../registry/dist/lib/spinner.js'
import { printHeader } from '../registry/dist/lib/stdio/header.js'

import constants from './constants.mjs'
import { runTests as runTestsWithOutput } from './utils/unified-runner.mjs'

const { WIN32 } = constants

// Track running processes for cleanup
const runningProcesses = new Set()

// Setup exit handler
const removeExitHandler = onExit((_code, signal) => {
  // Stop spinner first
  try {
    spinner.stop()
  } catch {}

  // Kill all running processes
  for (const child of runningProcesses) {
    try {
      child.kill('SIGTERM')
    } catch {}
  }

  if (signal) {
    console.log(`\nReceived ${signal}, cleaning up...`)
    // Let onExit handle the exit with proper code
    process.exitCode = 128 + (signal === 'SIGINT' ? 2 : 15)
  }
})

async function runCommand(command, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      ...(WIN32 && { shell: true }),
      ...options,
    })

    runningProcesses.add(child)

    child.on('exit', code => {
      runningProcesses.delete(child)
      resolve(code || 0)
    })

    child.on('error', error => {
      runningProcesses.delete(child)
      reject(error)
    })
  })
}

async function runCheck() {
  logger.step('Running checks')

  // Run fix (auto-format) quietly since it has its own output
  spinner.start('Formatting code...')
  let exitCode = await runCommand('pnpm', ['run', 'fix'], {
    stdio: 'pipe',
  })
  if (exitCode !== 0) {
    spinner.stop()
    logger.error('')
    logger.error('Formatting failed')
    // Re-run with output to show errors
    await runCommand('pnpm', ['run', 'fix'])
    return exitCode
  }
  spinner.stop()
  logger.success('Code formatted')

  // Run lint to check for remaining issues
  spinner.start('Running linter...')
  exitCode = await runCommand('node', ['scripts/lint.mjs'], {
    stdio: 'pipe',
  })
  if (exitCode !== 0) {
    spinner.stop()
    logger.error('')
    logger.error('Linting failed')
    // Re-run with output to show errors
    await runCommand('node', ['scripts/lint.mjs'])
    return exitCode
  }
  spinner.stop()
  logger.success('Linting passed')

  // Run TypeScript check
  spinner.start('Checking TypeScript...')
  exitCode = await runCommand('tsgo', ['--noEmit', '-p', 'tsconfig.json'], {
    stdio: 'pipe',
  })
  if (exitCode !== 0) {
    spinner.stop()
    logger.error('')
    logger.error('TypeScript check failed')
    // Re-run with output to show errors
    await runCommand('tsgo', ['--noEmit', '-p', 'tsconfig.json'])
    return exitCode
  }
  spinner.stop()
  logger.success('TypeScript check passed')

  return exitCode
}

async function runBuild() {
  const distPath = path.join(constants.rootPath, 'registry', 'dist')
  if (!existsSync(distPath)) {
    logger.step('Building project')
    return runCommand('pnpm', ['run', 'build'])
  }
  return 0
}

async function runTests(options, positionals = []) {
  const { coverage, force, update } = options

  // Build spawn environment
  const spawnEnv = {
    ...process.env,
    ...(force ? { FORCE_TEST: '1' } : {}),
  }

  // Handle Windows vs Unix for vitest executable
  const vitestCmd = WIN32 ? 'vitest.cmd' : 'vitest'
  const vitestPath = path.join(constants.rootNodeModulesBinPath, vitestCmd)

  // Expand glob patterns in positionals
  const expandedArgs = []
  for (const arg of positionals) {
    // Check if the argument looks like a glob pattern
    if (arg.includes('*') && !arg.startsWith('-')) {
      const files = fastGlob.sync(arg, { cwd: constants.rootPath })
      expandedArgs.push(...files)
    } else {
      expandedArgs.push(arg)
    }
  }

  // Build vitest arguments
  const vitestArgs = [
    'run',
    '--config',
    '.config/vitest.config.mts',
    ...(coverage ? ['--coverage'] : []),
    ...(update ? ['--update'] : []),
    ...expandedArgs,
  ]

  // On Windows, .cmd files need to be executed with shell: true
  const spawnOptions = {
    cwd: constants.rootPath,
    env: spawnEnv,
    shell: WIN32,
    verbose: false,
  }

  // Use unified runner for interactive Ctrl+O experience
  if (process.stdout.isTTY) {
    return runTestsWithOutput(vitestPath, vitestArgs, spawnOptions)
  }

  // Fallback to regular spawn for non-TTY
  return runCommand(vitestPath, vitestArgs, {
    cwd: constants.rootPath,
    env: spawnEnv,
    shell: WIN32,
    stdio: 'inherit',
  })
}

async function main() {
  try {
    // Parse arguments
    const { positionals, values } = parseArgs({
      options: {
        help: {
          type: 'boolean',
          default: false,
        },
        fast: {
          type: 'boolean',
          default: false,
        },
        quick: {
          type: 'boolean',
          default: false,
        },
        'skip-build': {
          type: 'boolean',
          default: false,
        },
        staged: {
          type: 'boolean',
          default: false,
        },
        all: {
          type: 'boolean',
          default: false,
        },
        force: {
          type: 'boolean',
          default: false,
        },
        cover: {
          type: 'boolean',
          default: false,
        },
        coverage: {
          type: 'boolean',
          default: false,
        },
        update: {
          type: 'boolean',
          default: false,
        },
      },
      allowPositionals: true,
      strict: false,
    })

    // Show help if requested
    if (values.help) {
      console.log('Test Runner')
      console.log('\nUsage: pnpm test [options] [-- vitest-args...]')
      console.log('\nOptions:')
      console.log('  --help              Show this help message')
      console.log(
        '  --fast, --quick     Skip lint/type checks for faster execution',
      )
      console.log('  --cover, --coverage Run tests with code coverage')
      console.log('  --update            Update test snapshots')
      console.log('  --all, --force      Run all tests regardless of changes')
      console.log('  --staged            Run tests affected by staged changes')
      console.log('  --skip-build        Skip the build step')
      console.log('\nExamples:')
      console.log(
        '  pnpm test                  # Run checks, build, and tests for changed files',
      )
      console.log('  pnpm test --all            # Run all tests')
      console.log(
        '  pnpm test --fast           # Skip checks for quick testing',
      )
      console.log('  pnpm test --cover          # Run with coverage report')
      console.log('  pnpm test --fast --cover   # Quick test with coverage')
      console.log('  pnpm test --update         # Update test snapshots')
      console.log('  pnpm test -- --reporter=dot # Pass args to vitest')
      process.exitCode = 0
      return
    }

    printHeader('Test Runner')

    // Handle aliases
    const skipChecks = values.fast || values.quick
    const withCoverage = values.cover || values.coverage

    let exitCode = 0

    // Run checks unless skipped
    if (!skipChecks) {
      exitCode = await runCheck()
      if (exitCode !== 0) {
        logger.error('')
        logger.error('Checks failed')
        process.exitCode = exitCode
        return
      }
      logger.success('All checks passed')
    }

    // Run build unless skipped
    if (!values['skip-build']) {
      exitCode = await runBuild()
      if (exitCode !== 0) {
        logger.error('')
        logger.error('Build failed')
        process.exitCode = exitCode
        return
      }
    }

    // Run tests
    exitCode = await runTests(
      { ...values, coverage: withCoverage },
      positionals,
    )

    if (exitCode !== 0) {
      logger.error('')
      logger.error('Tests failed')
      process.exitCode = exitCode
    } else {
      logger.success('All tests passed!')
    }
  } catch (error) {
    // Ensure spinner is stopped
    try {
      spinner.stop()
    } catch {}
    logger.error('')
    logger.error(`Test runner failed: ${error.message}`)
    process.exitCode = 1
  } finally {
    // Ensure spinner is stopped and cleared
    try {
      spinner.stop()
    } catch {}
    try {
      // Clear any remaining spinner output
      process.stdout.write('\r\x1b[K')
      process.stdout.write('\r')
    } catch {}

    // Clean up exit handler
    try {
      removeExitHandler()
    } catch {}

    // Exit with the appropriate code
    process.exit(process.exitCode || 0)
  }
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
