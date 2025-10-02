/** @fileoverview Shared helper functions for testing scripts. */

/**
 * Create a validation issue object.
 */
function createIssue(type, severity, message, details) {
  const issue = {
    type,
    severity,
    message,
  }
  if (details) {
    issue.details = details
  }
  return issue
}

/**
 * Check if a path exists (synchronously).
 */
function pathExists(filepath) {
  try {
    const { existsSync } = require('node:fs')
    return existsSync(filepath)
  } catch {
    return false
  }
}

/**
 * Read and parse JSON file safely.
 */
async function readJsonFile(filepath) {
  const fs = await import('node:fs/promises')
  try {
    const content = await fs.readFile(filepath, 'utf8')
    return JSON.parse(content)
  } catch (e) {
    throw new Error(`Failed to read or parse ${filepath}: ${e.message}`, {
      cause: e,
    })
  }
}

/**
 * Common test file patterns to check.
 */
const COMMON_TEST_PATHS = [
  '__tests__',
  'spec',
  'test',
  'test.cjs',
  'test.js',
  'test.mjs',
  'tests',
  'tests.js',
]

/**
 * Common problematic import patterns to detect.
 */
const PROBLEMATIC_IMPORT_PATTERNS = [
  {
    message: 'Direct .pnpm directory reference detected',
    pattern: /require\(['"][^'"]*\.pnpm[^'"]*['"]\)/,
  },
  {
    message: 'Import with relative path traversal to node_modules',
    pattern: /from ['"]\.\.\/\.\.\/node_modules/,
  },
  {
    message: 'Relative path traversal to node_modules detected',
    pattern: /require\(['"]\.\.\/\.\.\/node_modules/,
  },
]

export {
  COMMON_TEST_PATHS,
  PROBLEMATIC_IMPORT_PATTERNS,
  createIssue,
  pathExists,
  readJsonFile,
}
