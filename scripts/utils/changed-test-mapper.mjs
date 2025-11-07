/**
 * @fileoverview Maps changed source files to test files for affected test running.
 * Uses git utilities from socket-registry to detect changes.
 */

import { existsSync } from 'node:fs'
import path from 'node:path'

import {
  getChangedFilesSync,
  getStagedFilesSync,
} from '@socketsecurity/lib/git'
import { normalizePath } from '@socketsecurity/lib/path'
import { getDefaultLogger } from '@socketsecurity/lib/logger'

const logger = getDefaultLogger()
const rootPath = path.resolve(process.cwd())
const DEBUG = process.env.DEBUG_TEST_MAPPER === '1'

function debug(message) {
  if (DEBUG) {
    logger.log(`[test-mapper] ${message}`)
  }
}

/**
 * Core files that require running all tests when changed.
 */
const CORE_FILES = [
  'src/helpers.ts',
  'src/strings.ts',
  'src/constants.ts',
  'src/lang.ts',
  'src/error.ts',
  'src/validate.ts',
  'src/normalize.ts',
  'src/encode.ts',
  'src/decode.ts',
  'src/objects.ts',
]

/**
 * Map source files to their corresponding test files.
 * Returns array of test paths or ['all'] for core files.
 */
function mapSourceToTests(filepath) {
  const normalized = normalizePath(filepath)

  // Skip non-code files
  const ext = path.extname(normalized)
  const codeExtensions = ['.js', '.mjs', '.cjs', '.ts', '.cts', '.mts', '.json']
  if (!codeExtensions.includes(ext)) {
    return []
  }

  // Core utilities affect all tests
  if (CORE_FILES.some(f => normalized.includes(f))) {
    return ['all']
  }

  // Map specific files to their test files
  const basename = path.basename(normalized, path.extname(normalized))
  const testFile = `test/${basename}.test.mts`

  // Check if corresponding test exists
  if (existsSync(path.join(rootPath, testFile))) {
    debug(`Mapped ${normalized} to ${testFile}`)
    return [testFile]
  }

  // Warn if mapped test file is missing
  if (process.env.NODE_ENV !== 'test') {
    logger.warn(`Warning: Expected test file not found: ${testFile}`)
  }

  // Special mappings
  if (normalized.includes('src/package-url.ts')) {
    return ['test/package-url.test.mts', 'test/integration.test.mts']
  }
  if (normalized.includes('src/package-url-builder.ts')) {
    return ['test/package-url-builder.test.mts', 'test/integration.test.mts']
  }
  if (normalized.includes('src/url-converter.ts')) {
    return ['test/url-converter.test.mts']
  }
  if (normalized.includes('src/result.ts')) {
    return ['test/result.test.mts']
  }

  // If no specific mapping, run all tests to be safe
  return ['all']
}

/**
 * Get affected test files to run based on changed files.
 * Returns all tests in CI environment or when explicitly requested.
 * Returns null if no changes detected. Returns specific test files
 * based on source file mappings otherwise.
 *
 * @throws {Error} When root path does not exist.
 * @throws {Error} When git detection fails.
 */
export function getTestsToRun(options = {}) {
  const { all = false, staged = false } = options

  // Validate root path exists
  if (!existsSync(rootPath)) {
    throw new Error(`Root path does not exist: "${rootPath}"`)
  }

  // All mode runs all tests
  if (all || process.env.FORCE_TEST === '1') {
    return { tests: 'all', reason: 'explicit --all flag', mode: 'all' }
  }

  // CI always runs all tests
  if (process.env.CI === 'true') {
    return { tests: 'all', reason: 'CI environment', mode: 'all' }
  }

  // Get changed files with error handling
  let changedFiles
  try {
    changedFiles = staged ? getStagedFilesSync() : getChangedFilesSync()
  } catch (e) {
    // Fallback to all tests if git detection fails
    debug(`Git detection failed: ${e.message}`)
    return {
      tests: 'all',
      reason: 'git detection failed',
      mode: 'all',
    }
  }

  const mode = staged ? 'staged' : 'changed'
  debug(`Found ${changedFiles.length} changed files (${mode})`)

  if (changedFiles.length === 0) {
    // No changes, skip tests
    return { tests: null, mode }
  }

  const testFiles = new Set()
  let runAllTests = false
  let runAllReason = ''

  for (const file of changedFiles) {
    const normalized = normalizePath(file)

    // Test files always run themselves
    if (normalized.startsWith('test/') && normalized.includes('.test.')) {
      // Skip deleted files.
      if (existsSync(path.join(rootPath, file))) {
        testFiles.add(file)
      }
      continue
    }

    // Source files map to test files
    if (normalized.startsWith('src/')) {
      const tests = mapSourceToTests(normalized)
      if (tests.includes('all')) {
        runAllTests = true
        runAllReason = 'core file changes'
        break
      }
      for (const test of tests) {
        // Skip deleted files.
        if (existsSync(path.join(rootPath, test))) {
          testFiles.add(test)
        }
      }
      continue
    }

    // Config changes run all tests
    if (normalized.includes('vitest.config')) {
      runAllTests = true
      runAllReason = 'vitest config changed'
      break
    }

    if (normalized.includes('tsconfig')) {
      runAllTests = true
      runAllReason = 'TypeScript config changed'
      break
    }

    // Data changes run integration tests
    if (normalized.startsWith('data/')) {
      // Skip deleted files.
      if (existsSync(path.join(rootPath, 'test/integration.test.mts'))) {
        testFiles.add('test/integration.test.mts')
      }
      if (existsSync(path.join(rootPath, 'test/purl-types.test.mts'))) {
        testFiles.add('test/purl-types.test.mts')
      }
    }
  }

  if (runAllTests) {
    debug(`Running all tests: ${runAllReason}`)
    return { tests: 'all', reason: runAllReason, mode: 'all' }
  }

  if (testFiles.size === 0) {
    // If we had source changes but no valid tests, run all tests for safety
    if (changedFiles.length > 0) {
      debug('No valid test mappings found, running all tests for safety')
      return {
        tests: 'all',
        reason: 'no valid test mappings found',
        mode: 'all',
      }
    }
    return { tests: null, mode }
  }

  const tests = Array.from(testFiles)
  debug(`Running ${tests.length} specific test(s): ${tests.join(', ')}`)
  return { tests, mode }
}
