/** @fileoverview Test script cleaning utilities for normalizing test commands. */

/**
 * Clean test script by removing unsupported flags and pre/post actions.
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

export { cleanTestScript }
