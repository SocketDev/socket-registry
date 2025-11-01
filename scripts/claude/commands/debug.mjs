/**
 * @fileoverview Debug command - helps debug errors and issues.
 * Provides root cause analysis and debugging assistance.
 */

import { existsSync, promises as fs } from 'node:fs'
import path from 'node:path'

import { runClaude } from '../command-execution.mjs'
import { log, rootPath } from '../config.mjs'
import { printHeader } from '../utils/formatting.mjs'

/**
 * Help with debugging issues.
 */
async function runDebug(claudeCmd, options = {}) {
  const opts = { __proto__: null, ...options }
  printHeader('Debugging Assistant')

  const { positionals = [] } = opts
  const errorOrFile = positionals.join(' ')

  if (!errorOrFile) {
    log.error('Please provide an error message or stack trace')
    log.substep('Usage: pnpm claude --debug "<error message>"')
    log.substep('   or: pnpm claude --debug <log-file>')
    return false
  }

  let debugContent = errorOrFile

  // Check if it's a file.
  const possibleFile = path.isAbsolute(errorOrFile)
    ? errorOrFile
    : path.join(rootPath, errorOrFile)
  if (existsSync(possibleFile)) {
    debugContent = await fs.readFile(possibleFile, 'utf8')
  }

  const prompt = `Help debug this issue:

${debugContent}

Provide:
1. Root cause analysis
2. Step-by-step debugging approach
3. Potential fixes with code
4. Prevention strategies
5. Related issues to check
6. Testing to verify the fix

Be specific and actionable.`

  await runClaude(claudeCmd, prompt, opts)

  return true
}

export { runDebug }
