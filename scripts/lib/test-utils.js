'use strict'

const constants = require('@socketregistry/scripts/constants')
const { pEach } = require('@socketsecurity/registry/lib/promises')
const trash = require('trash')

const { DEFAULT_CONCURRENCY } = constants

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
        '$1'
      )
      // Remove unsupported Node flag "--es-staging".
      .replace(/(?<=node)(?: +--[-\w]+)+/, m =>
        m.replaceAll(' --es-staging', '')
      )
      .trim()
  )
}

/**
 * Safely remove files/directories using trash, with fallback to fs.rm.
 * @param {string|string[]} paths - Path(s) to remove
 * @param {object} options - Options for fs.rm fallback
 * @returns {Promise<void>}
 */
async function safeRemove(paths, options = {}) {
  const pathArray = Array.isArray(paths) ? paths : [paths]
  if (pathArray.length === 0) {
    return
  }

  try {
    await trash(pathArray)
  } catch {
    // If trash fails, fallback to fs.rm.
    const fs = require('node:fs').promises
    const { concurrency = DEFAULT_CONCURRENCY, ...rmOptions } = options
    const defaultRmOptions = { force: true, recursive: true, ...rmOptions }

    await pEach(
      pathArray,
      async p => {
        try {
          await fs.rm(p, defaultRmOptions)
        } catch (rmError) {
          // Only warn about non-ENOENT errors if a spinner is provided.
          if (rmError.code !== 'ENOENT' && options.spinner) {
            options.spinner.warn(`Failed to remove ${p}: ${rmError.message}`)
          }
        }
      },
      { concurrency }
    )
  }
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
  'test'
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
  'test:all'
]

module.exports = {
  cleanTestScript,
  safeRemove,
  testRunners,
  testScripts
}
