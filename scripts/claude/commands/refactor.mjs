/**
 * @fileoverview Code refactoring command for Claude CLI.
 * Suggests refactoring improvements for code files.
 */

import { existsSync, promises as fs } from 'node:fs'
import path from 'node:path'

import { rootPath } from '../config.mjs'
import { log, printHeader, runClaude } from '../utils.mjs'

/**
 * Suggest code refactoring improvements.
 */
async function runRefactor(claudeCmd, options = {}) {
  const opts = { __proto__: null, ...options }
  printHeader('Code Refactoring Analysis')

  const { positionals = [] } = opts
  const targetFile = positionals[0]

  if (!targetFile) {
    log.error('Please specify a file to refactor')
    log.substep('Usage: pnpm claude --refactor <file>')
    return false
  }

  const filePath = path.isAbsolute(targetFile)
    ? targetFile
    : path.join(rootPath, targetFile)

  if (!existsSync(filePath)) {
    log.error(`File not found: ${targetFile}`)
    return false
  }

  const fileContent = await fs.readFile(filePath, 'utf8')

  const prompt = `Analyze and suggest refactoring for this code:

${fileContent}

Identify and fix:
1. Code smells (long functions, duplicate code, etc.)
2. Performance bottlenecks
3. Readability issues
4. Maintainability problems
5. Design pattern improvements
6. SOLID principle violations
7. Socket coding standards compliance

Provide the refactored code with explanations.`

  await runClaude(claudeCmd, prompt, opts)

  return true
}

export { runRefactor }
