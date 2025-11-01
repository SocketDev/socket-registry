/**
 * @fileoverview Explain command - explains code or concepts.
 * Provides code explanations and educational content using Claude.
 */

import { existsSync, promises as fs } from 'node:fs'
import path from 'node:path'

import { runClaude } from '../command-execution.mjs'
import { log, rootPath } from '../config.mjs'
import { printHeader } from '../utils/formatting.mjs'

/**
 * Explain code or concepts.
 */
async function runExplain(claudeCmd, options = {}) {
  const opts = { __proto__: null, ...options }
  printHeader('Code Explanation')

  const { positionals = [] } = opts
  const targetFile = positionals[0]

  if (!targetFile) {
    log.error('Please specify a file or concept to explain')
    log.substep('Usage: pnpm claude --explain <file|concept>')
    return false
  }

  // Check if it's a file or a concept.
  const filePath = path.isAbsolute(targetFile)
    ? targetFile
    : path.join(rootPath, targetFile)

  let prompt
  if (existsSync(filePath)) {
    const fileContent = await fs.readFile(filePath, 'utf8')
    prompt = `Explain this code in detail:

${fileContent}

Provide:
1. Overall purpose and architecture
2. Function-by-function breakdown
3. Algorithm explanations
4. Data flow analysis
5. Dependencies and interactions
6. Performance characteristics
7. Potential improvements

Make it educational and easy to understand.`
  } else {
    // Treat as a concept to explain.
    prompt = `Explain the concept: ${targetFile}

Provide:
1. Clear definition
2. How it works
3. Use cases
4. Best practices
5. Common pitfalls
6. Code examples
7. Related concepts

Focus on practical understanding for developers.`
  }

  await runClaude(claudeCmd, prompt, opts)

  return true
}

export { runExplain }
