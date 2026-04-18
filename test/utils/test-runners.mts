/** @fileoverview Test runner configuration and script name utilities. */

/**
 * List of test script names to try in order of preference.
 */
export const testScripts: string[] = [
  // Order is significant. First in, first tried.
  'mocha',
  'specs',
  'test:source',
  'tests-only',
  'test:readable-stream-only',
  'test',
]

/**
 * List of test runner script names.
 */
export const testRunners: string[] = [
  'mocha',
  'jest',
  'ava',
  'tap',
  'tape',
  'specs',
  'tests-only',
  'test:source',
  'test:stock',
  'test:all',
]
