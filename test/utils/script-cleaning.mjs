/** @fileoverview Test script cleaning utilities for normalizing test commands. */

/**
 * Clean test script by removing unsupported flags and pre/post actions.
 */
function cleanTestScript(testScript) {
  let cleaned = testScript
    // Strip actions BEFORE and AFTER the test runner is invoked.
    .replace(
      /^.*?(\b(?:ava|jest|node|npm run|mocha|tape?)\b.*?)(?:&.+|$)/,
      '$1',
    )
    // Remove unsupported Node flag "--es-staging".
    .replace(/(?<=node)(?: +--[-\w]+)+/, m => m.replaceAll(' --es-staging', ''))
    .trim()

  // If cleaned script is a non-test command, try to find a real test runner.
  const nonTestPatterns =
    /^npm run (?:lint|build|prepare|prepublish|pretest|posttest)$/
  if (nonTestPatterns.test(cleaned)) {
    // Try to find the first actual test runner after the non-test command.
    const testRunnerMatch = testScript.match(
      /(?:&&|;)\s*(\b(?:ava|jest|mocha|tape?|npm run (?:mocha|test|tests|spec|specs))\b[^&;]*)/,
    )
    if (testRunnerMatch) {
      cleaned = testRunnerMatch[1].trim()
    }
  }

  return cleaned
}

export { cleanTestScript }
