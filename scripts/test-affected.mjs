/**
 * @fileoverview Smart test runner that only runs tests affected by changed files.
 * Handles test selection based on file changes to speed up local and precommit runs.
 */

import path from 'node:path'

import { promises as fs } from 'node:fs'

import fastGlob from 'fast-glob'

import { logger } from '../registry/dist/lib/logger.js'
import { spawn } from '../registry/dist/lib/spawn.js'

import constants from './constants.mjs'
import { getStagedFiles } from './utils/git.mjs'

const CORE_LIB_FILES = new Set([
  'registry/src/lib/fs.ts',
  'registry/src/lib/git.ts',
  'registry/src/lib/path.ts',
  'registry/src/lib/spawn.ts',
  'registry/src/lib/promises.ts',
  'registry/src/lib/objects.ts',
  'registry/src/lib/arrays.ts',
  'registry/src/lib/strings.ts',
])

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

  // Handle registry source files.
  if (filepath.startsWith('registry/src/lib/')) {
    const basename = path.basename(filepath, path.extname(filepath))
    // Direct test file mapping.
    const directTest = `test/registry/${basename}.test.mts`
    tests.push(directTest)

    // Some files have multiple related tests.
    if (basename === 'packages') {
      tests.push('test/registry/packages-*.test.mts', 'test/packages.test.mts')
    }
  }

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

  // Check if any core files changed.
  for (const file of changedFiles) {
    // Core library files that are widely used.
    if (CORE_LIB_FILES.has(file)) {
      return true
    }

    // Config or infrastructure files.
    for (const pattern of RUN_ALL_PATTERNS) {
      if (file.includes(pattern.replace('**', ''))) {
        return true
      }
    }

    // Registry types or external deps.
    if (
      file.includes('registry/src/types.ts') ||
      file.includes('registry/src/external/')
    ) {
      return true
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
        cwd: constants.rootPath,
      }),
    ),
  )
  const allFiles = globResults.flat()

  // Deduplicate and verify files exist.
  const uniqueFiles = [...new Set(allFiles)]

  // Check file existence in parallel.
  const existenceChecks = await Promise.all(
    uniqueFiles.map(async file => {
      const filepath = path.join(constants.rootPath, file)
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
  const { WIN32 } = constants

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
      const vitestPath = path.join(constants.rootNodeModulesBinPath, vitestCmd)

      const spawnOptions = {
        cwd: constants.rootPath,
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
    const isPrecommit = process.env['PRE_COMMIT'] === '1'
    let changedFiles = []

    if (isPrecommit) {
      changedFiles = await getStagedFiles({ absolute: false })
      logger.log(`Found ${changedFiles.length} staged file(s)\n`)
    } else {
      const { getChangedFiles } = await import('../registry/dist/lib/git.js')
      changedFiles = await getChangedFiles({ absolute: false })
      logger.log(`Found ${changedFiles.length} changed file(s)\n`)
    }

    // Decide if we should run all tests.
    if (runAll || shouldRunAllTests(changedFiles)) {
      logger.log('Running all tests...\n')
      const vitestCmd = WIN32 ? 'vitest.cmd' : 'vitest'
      const vitestPath = path.join(constants.rootNodeModulesBinPath, vitestCmd)

      const spawnOptions = {
        cwd: constants.rootPath,
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
      const vitestPath = path.join(constants.rootNodeModulesBinPath, vitestCmd)

      const spawnOptions = {
        cwd: constants.rootPath,
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
      const vitestPath = path.join(constants.rootNodeModulesBinPath, vitestCmd)

      const spawnOptions = {
        cwd: constants.rootPath,
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
    const vitestPath = path.join(constants.rootNodeModulesBinPath, vitestCmd)

    const spawnOptions = {
      cwd: constants.rootPath,
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

main().catch(console.error)
