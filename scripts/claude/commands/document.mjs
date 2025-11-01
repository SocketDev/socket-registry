/**
 * @fileoverview Documentation generation command for Claude CLI.
 * Generates or updates project documentation.
 */

import { rootPath } from '../config.mjs'
import { printHeader, runCommand } from '../utils.mjs'

/**
 * Generate or update documentation.
 */
async function runDocumentation(claudeCmd, options = {}) {
  const opts = { __proto__: null, ...options }
  printHeader('Documentation Generation')

  const { positionals = [] } = opts
  const targetPath = positionals[0] || rootPath

  const prompt = `Generate or update documentation for the project at ${targetPath}.

Tasks:
1. Generate JSDoc comments for functions lacking documentation
2. Create/update API documentation
3. Improve README if needed
4. Document complex algorithms
5. Add usage examples
6. Document configuration options

Follow Socket documentation standards.
Output the documentation updates or new content.`

  await runCommand(claudeCmd, [], {
    input: prompt,
    stdio: 'inherit',
    cwd: targetPath,
  })

  return true
}

export { runDocumentation }
