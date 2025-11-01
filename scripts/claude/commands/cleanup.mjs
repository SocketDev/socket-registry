/**
 * @fileoverview Cleanup command - finds and removes unused code.
 * Analyzes the codebase for cleanup opportunities.
 */

import { runCommand } from '../command-execution.mjs'
import { log, rootPath } from '../config.mjs'
import { printHeader } from '../utils/formatting.mjs'

/**
 * Clean up code by removing unused elements.
 */
async function runCleanup(claudeCmd, options = {}) {
  const _opts = { __proto__: null, ...options }
  printHeader('Code Cleanup')

  log.step('Analyzing codebase for cleanup opportunities')

  const prompt = `Analyze the project and identify cleanup opportunities:

1. Unused imports and variables
2. Dead code paths
3. Commented-out code blocks
4. Duplicate code
5. Unused dependencies
6. Obsolete configuration
7. Empty files
8. Unreachable code

For each item found:
- Specify file and line numbers
- Explain why it can be removed
- Note any potential risks

Format as actionable tasks.`

  await runCommand(claudeCmd, [], {
    input: prompt,
    stdio: 'inherit',
    cwd: rootPath,
  })

  return true
}

export { runCleanup }
