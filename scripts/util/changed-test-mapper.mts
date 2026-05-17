/**
 * @fileoverview Maps changed source files to test files for affected test running.
 * Uses git utilities from @socketsecurity/lib to detect changes.
 */

import { existsSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'

import {
  getChangedFilesSync,
  getStagedFilesSync,
} from '@socketsecurity/lib/git'
import { getDefaultLogger } from '@socketsecurity/lib/logger'
import { normalizePath } from '@socketsecurity/lib/paths/normalize'

const logger = getDefaultLogger()
const rootPath = path.resolve(process.cwd())
const DEBUG = process.env.DEBUG_TEST_MAPPER === '1'

export function debug(message: string): void {
  if (DEBUG) {
    logger.log(`[test-mapper] ${message}`)
  }
}

interface GetTestsToRunOptions {
  all?: boolean | undefined
  staged?: boolean | undefined
}

interface TestsToRunResult {
  mode: string
  reason?: string | undefined
  tests: string[] | 'all' | undefined
}

/**
 * Get affected test files to run based on changed files.
 * Returns 'all' in CI, when explicitly requested, or when structural files change.
 * Returns undefined if no relevant changes detected.
 * Returns a list of specific test files otherwise.
 *
 * @throws {Error} When root path does not exist.
 */
export function getTestsToRun(
  options: GetTestsToRunOptions = {},
): TestsToRunResult {
  const { all = false, staged = false } = {
    __proto__: null,
    ...options,
  } as GetTestsToRunOptions

  if (!existsSync(rootPath)) {
    throw new Error(`Root path does not exist: "${rootPath}"`)
  }

  if (all || process.env.FORCE_TEST === '1') {
    return { mode: 'all', reason: 'explicit --all flag', tests: 'all' }
  }

  if (process.env.CI === 'true') {
    return { mode: 'all', reason: 'CI environment', tests: 'all' }
  }

  let changedFiles: string[]
  try {
    changedFiles = staged ? getStagedFilesSync() : getChangedFilesSync()
  } catch (e) {
    debug(`Git detection failed: ${(e as Error).message}`)
    return { mode: 'all', reason: 'git detection failed', tests: 'all' }
  }

  const mode = staged ? 'staged' : 'changed'
  debug(`Found ${changedFiles.length} changed files (${mode})`)

  if (!changedFiles.length) {
    return { mode, tests: undefined }
  }

  const testFiles = new Set<string>()
  let runAllReason = ''

  for (let i = 0, { length } = changedFiles; i < length; i += 1) {
    const file = changedFiles[i]
    const normalized = normalizePath(file)

    // Test files run themselves (if not deleted).
    if (normalized.startsWith('test/') && normalized.includes('.test.')) {
      if (existsSync(path.join(rootPath, file))) {
        testFiles.add(file)
      }
      continue
    }

    // Structural/config changes — run everything.
    if (
      normalized.includes('vitest.config') ||
      normalized.includes('tsconfig') ||
      normalized === 'package.json' ||
      normalized === 'pnpm-lock.yaml'
    ) {
      runAllReason = `${normalized} changed`
      break
    }

    // Registry source changes — run registry + packages tests.
    if (normalized.startsWith('registry/')) {
      runAllReason = 'registry source changed'
      break
    }

    // Package override changes — run packages test.
    if (normalized.startsWith('packages/npm/')) {
      const packagesTest = 'test/packages.test.mts'
      if (existsSync(path.join(rootPath, packagesTest))) {
        testFiles.add(packagesTest)
      }
      continue
    }

    // Scripts / utility changes — run all to be safe.
    if (normalized.startsWith('scripts/')) {
      runAllReason = 'scripts changed'
      break
    }
  }

  if (runAllReason) {
    debug(`Running all tests: ${runAllReason}`)
    return { mode: 'all', reason: runAllReason, tests: 'all' }
  }

  if (!testFiles.size) {
    return { mode, tests: undefined }
  }

  const tests = Array.from(testFiles)
  debug(`Running ${tests.length} specific test(s): ${tests.join(', ')}`)
  return { mode, tests }
}
