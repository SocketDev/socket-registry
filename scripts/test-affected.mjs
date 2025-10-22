/**
 * @fileoverview Smart test runner that only runs tests affected by changed files.
 * Handles test selection based on file changes to speed up local and precommit runs.
 */

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { getChangedFiles } from '@socketsecurity/lib/git'
import { logger } from '@socketsecurity/lib/logger'
import { spawn } from '@socketsecurity/lib/spawn'
import fastGlob from 'fast-glob'

import { WIN32 } from './constants/node.mjs'
import { ROOT_NODE_MODULES_BIN_PATH, ROOT_PATH } from './constants/paths.mjs'
import { getStagedFiles } from './utils/git.mjs'

const RUN_ALL_PATTERNS = [
  '.config/**',
  'scripts/utils/**',
  'vitest*.config.*',
  'package.json',
  'pnpm-lock.yaml',
]

/**
 * Map a source file to its corresponding test file(s).
 */
function mapSourceToTests(filepath) {
  const tests = []

  // Handle npm package overrides.
  if (filepath.startsWith('packages/npm/')) {
    const match = filepath.match(/packages\/npm\/([^/]+)\//)
    if (match) {
      const pkgName = match[1]
      tests.push(`test/npm/${pkgName}.test.mts`)
    }
  }

  // Handle test files directly.
  if (filepath.startsWith('test/') && filepath.endsWith('.test.mts')) {
    tests.push(filepath)
  }

  return tests
}

/**
 * Check if we should run all tests based on changed files.
 */
function shouldRunAllTests(changedFiles) {
  // If no files changed, run all tests.
  if (!changedFiles.length) {
    return true
  }

  // Check if any config files changed.
  for (const file of changedFiles) {
    // Config or infrastructure files.
    for (const pattern of RUN_ALL_PATTERNS) {
      if (file.includes(pattern.replace('**', ''))) {
        return true
      }
    }
  }

  return false
}

/**
 * Get all test files matching the patterns.
 */
async function resolveTestFiles(patterns) {
  const uniquePatterns = [...new Set(patterns)]

  // Run all glob patterns in parallel.
  const globResults = await Promise.all(
    uniquePatterns.map(pattern =>
      fastGlob(pattern, {
        absolute: false,
        cwd: ROOT_PATH,
      }),
    ),
  )
  const allFiles = globResults.flat()

  // Deduplicate and verify files exist.
  const uniqueFiles = [...new Set(allFiles)]

  // Check file existence in parallel.
  const existenceChecks = await Promise.all(
    uniqueFiles.map(async file => {
      const filepath = path.join(ROOT_PATH, file)
      try {
        await fs.access(filepath)
        return file
      } catch {
        return undefined
      }
    }),
  )

  return existenceChecks.filter(file => file !== undefined)
}

/**
 * Main function to determine and run affected tests.
 */
async function main() {
  try {
    // Get arguments.
    let args = process.argv.slice(2)

    // Remove the -- separator if present.
    if (args[0] === '--') {
      args = args.slice(1)
    }

    // Check for --force flag.
    const forceIndex = args.indexOf('--force')
    const hasForce = forceIndex !== -1

    if (hasForce) {
      args.splice(forceIndex, 1)
    }

    // Check for --all flag.
    const allIndex = args.indexOf('--all')
    const runAll = allIndex !== -1

    if (runAll) {
      args.splice(allIndex, 1)
    }

    // If specific files are provided, use them.
    if (args.length > 0 && !args[0].startsWith('-')) {
      logger.log('Running specified tests...\n')
      const vitestCmd = WIN32 ? 'vitest.cmd' : 'vitest'
      const vitestPath = path.join(ROOT_NODE_MODULES_BIN_PATH, vitestCmd)

      const spawnOptions = {
        cwd: ROOT_PATH,
        env: {
          ...process.env,
          ...(hasForce ? { FORCE_TEST: '1' } : {}),
        },
        shell: WIN32,
        stdio: 'inherit',
      }

      await spawn(
        vitestPath,
        ['run', '--config', '.config/vitest.config.mts', ...args],
        spawnOptions,
      )
        .then(result => {
          process.exitCode = result.code || 0
        })
        .catch(e => {
          logger.error('Error running tests:', e)
          process.exitCode = 1
        })

      return
    }

    // Get staged files (for precommit) or all changed files.
    const isPrecommit = process.env.PRE_COMMIT === '1'
    let changedFiles = []

    if (isPrecommit) {
      changedFiles = await getStagedFiles({ absolute: false })
      logger.log(`Found ${changedFiles.length} staged file(s)\n`)
    } else {
      changedFiles = await getChangedFiles({ absolute: false })
      logger.log(`Found ${changedFiles.length} changed file(s)\n`)
    }

    // Decide if we should run all tests.
    if (runAll || shouldRunAllTests(changedFiles)) {
      logger.log('Running all tests...\n')
      const vitestCmd = WIN32 ? 'vitest.cmd' : 'vitest'
      const vitestPath = path.join(ROOT_NODE_MODULES_BIN_PATH, vitestCmd)

      const spawnOptions = {
        cwd: ROOT_PATH,
        env: {
          ...process.env,
          ...(hasForce ? { FORCE_TEST: '1' } : {}),
        },
        shell: WIN32,
        stdio: 'inherit',
      }

      await spawn(
        vitestPath,
        ['run', '--config', '.config/vitest.config.mts', ...args],
        spawnOptions,
      )
        .then(result => {
          process.exitCode = result.code || 0
        })
        .catch(e => {
          logger.error('Error running tests:', e)
          process.exitCode = 1
        })

      return
    }

    // Map changed files to test files.
    const testPatterns = []
    for (const file of changedFiles) {
      const tests = mapSourceToTests(file)
      testPatterns.push(...tests)
    }

    // If no specific tests found, run all.
    if (!testPatterns.length) {
      logger.log('No specific tests found for changes, running all tests...\n')
      const vitestCmd = WIN32 ? 'vitest.cmd' : 'vitest'
      const vitestPath = path.join(ROOT_NODE_MODULES_BIN_PATH, vitestCmd)

      const spawnOptions = {
        cwd: ROOT_PATH,
        env: {
          ...process.env,
          ...(hasForce ? { FORCE_TEST: '1' } : {}),
        },
        shell: WIN32,
        stdio: 'inherit',
      }

      await spawn(
        vitestPath,
        ['run', '--config', '.config/vitest.config.mts', ...args],
        spawnOptions,
      )
        .then(result => {
          process.exitCode = result.code || 0
        })
        .catch(e => {
          logger.error('Error running tests:', e)
          process.exitCode = 1
        })

      return
    }

    // Resolve test patterns to actual files.
    const testFiles = await resolveTestFiles(testPatterns)

    if (!testFiles.length) {
      logger.log('No test files found for changes, running all tests...\n')
      const vitestCmd = WIN32 ? 'vitest.cmd' : 'vitest'
      const vitestPath = path.join(ROOT_NODE_MODULES_BIN_PATH, vitestCmd)

      const spawnOptions = {
        cwd: ROOT_PATH,
        env: {
          ...process.env,
          ...(hasForce ? { FORCE_TEST: '1' } : {}),
        },
        shell: WIN32,
        stdio: 'inherit',
      }

      await spawn(
        vitestPath,
        ['run', '--config', '.config/vitest.config.mts', ...args],
        spawnOptions,
      )
        .then(result => {
          process.exitCode = result.code || 0
        })
        .catch(e => {
          logger.error('Error running tests:', e)
          process.exitCode = 1
        })

      return
    }

    logger.log(`Running ${testFiles.length} affected test file(s):\n`)
    for (const file of testFiles) {
      logger.log(`  - ${file}`)
    }
    logger.log('')

    // Run the affected tests.
    const vitestCmd = WIN32 ? 'vitest.cmd' : 'vitest'
    const vitestPath = path.join(ROOT_NODE_MODULES_BIN_PATH, vitestCmd)

    const spawnOptions = {
      cwd: ROOT_PATH,
      env: {
        ...process.env,
        ...(hasForce ? { FORCE_TEST: '1' } : {}),
      },
      shell: WIN32,
      stdio: 'inherit',
    }

    await spawn(
      vitestPath,
      ['run', '--config', '.config/vitest.config.mts', ...testFiles, ...args],
      spawnOptions,
    )
      .then(result => {
        process.exitCode = result.code || 0
      })
      .catch(e => {
        logger.error('Error running tests:', e)
        process.exitCode = 1
      })
  } catch (e) {
    logger.error('Error running tests:', e)
    process.exitCode = 1
  }
}

main().catch(e => logger.error(e))
