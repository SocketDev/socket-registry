/** @fileoverview Test script cleaning utilities for normalizing test commands. */

/**
 * Clean test script by removing unsupported flags and pre/post actions.
 */
export function cleanTestScript(testScript: string): string {
  // Remove unsupported Node flag "--es-staging".
  const cleaned = testScript.replace(/ --es-staging\b/g, '')

  // Split by && and filter out non-test commands.
  const parts = cleaned.split(/\s*&&\s*/)
  const filtered = parts.filter(
    part =>
      !/\b(?:biome|check|cleanup|eslint|format|lint|posttest|prepare|prepublish|standard|tsc|tslint|validate|xo)\b/.test(
        part,
      ),
  )

  return filtered.join(' && ').trim()
}
