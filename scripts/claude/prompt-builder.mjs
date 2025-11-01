/**
 * @fileoverview Prompt building utilities for Claude commands.
 * Wraps model-strategy's buildEnhancedPrompt for easier command use.
 */

import {
  buildEnhancedPrompt as baseBuildEnhancedPrompt,
  getSmartContext as baseGetSmartContext,
} from './model-strategy.mjs'
import { runCommandWithOutput } from './command-execution.mjs'

/**
 * Create bound getSmartContext that includes runCommandWithOutput.
 */
async function getSmartContext(contextOptions = {}) {
  return baseGetSmartContext(contextOptions, runCommandWithOutput)
}

/**
 * Build enhanced prompt with context.
 * Wrapper around model-strategy's buildEnhancedPrompt.
 */
async function buildEnhancedPrompt(template, basePrompt, options = {}) {
  const opts = { __proto__: null, ...options }
  return baseBuildEnhancedPrompt(template, basePrompt, opts, getSmartContext)
}

export { buildEnhancedPrompt }
