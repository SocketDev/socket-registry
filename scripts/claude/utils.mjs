/**
 * @fileoverview Utility functions consolidation for command modules.
 * Re-exports commonly used functions from specialized modules.
 */

import { prepareClaudeArgs, runClaude, runCommand, runCommandWithOutput } from './command-execution.mjs'
import { log } from './config.mjs'
import { getSmartContext as baseGetSmartContext } from './model-strategy.mjs'
import { executeParallel, runParallel, shouldRunParallel } from './parallel-execution.mjs'
import { ensureClaudeInGitignore } from './project-sync.mjs'
import { printFooter, printHeader } from './utils/formatting.mjs'

/**
 * Wrapper for getSmartContext that provides runCommandWithOutput.
 */
async function getSmartContext(options = {}) {
  const opts = { __proto__: null, ...options }
  return baseGetSmartContext(opts, runCommandWithOutput)
}

export {
  ensureClaudeInGitignore,
  executeParallel,
  getSmartContext,
  log,
  prepareClaudeArgs,
  printFooter,
  printHeader,
  runClaude,
  runCommand,
  runCommandWithOutput,
  runParallel,
  shouldRunParallel,
}
