/**
 * @fileoverview Code review command for Claude CLI.
 * Reviews staged git changes and provides constructive feedback.
 */

import { buildEnhancedPrompt } from '../prompt-builder.mjs'
import { log, printHeader, runClaude, runCommandWithOutput } from '../utils.mjs'

/**
 * Review code changes before committing.
 */
async function runCodeReview(claudeCmd, options = {}) {
  const opts = { __proto__: null, ...options }
  printHeader('Code Review')

  // Get git diff for staged changes.
  const diffResult = await runCommandWithOutput('git', ['diff', '--cached'])

  if (!diffResult.stdout.trim()) {
    log.info('No staged changes to review')
    log.substep('Stage changes with: git add <files>')
    return true
  }

  const basePrompt = `Review the following staged changes:

${diffResult.stdout}

Provide specific feedback with file:line references.
Format your review as constructive feedback with severity levels (critical/high/medium/low).
Also check for CLAUDE.md compliance and cross-platform compatibility.`

  // Use enhanced prompt with context
  const enhancedPrompt = await buildEnhancedPrompt('review', basePrompt, {
    // Only staged changes
    includeUncommitted: false,
    commits: 10,
  })

  log.step('Starting code review with Claude')
  await runClaude(claudeCmd, enhancedPrompt, opts)

  return true
}

export { runCodeReview }
