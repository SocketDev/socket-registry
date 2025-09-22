'use strict'

/**
 * Clean test script by removing unsupported flags and pre/post actions.
 * @param {string} testScript - The test script to clean
 * @returns {string} The cleaned test script
 */
function cleanTestScript(testScript) {
  return (
    testScript
      // Strip actions BEFORE and AFTER the test runner is invoked.
      .replace(
        /^.*?(\b(?:ava|jest|node|npm run|mocha|tape?)\b.*?)(?:&.+|$)/,
        '$1',
      )
      // Remove unsupported Node flag "--es-staging".
      .replace(/(?<=node)(?: +--[-\w]+)+/, m =>
        m.replaceAll(' --es-staging', ''),
      )
      .trim()
  )
}

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
  'tape',
  'tap',
  'specs',
  'tests-only',
  'test:source',
  'test:stock',
  'test:all',
]

module.exports = {
  cleanTestScript,
  testRunners,
  testScripts,
}
