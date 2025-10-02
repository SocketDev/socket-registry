/** @fileoverview Test runner configuration and script name utilities. */

/**
 * List of test script names to try in order of preference.
 */
const testScripts = [
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
const testRunners = [
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

export { testRunners, testScripts }
