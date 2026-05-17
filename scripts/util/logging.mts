/** @fileoverview Reusable logging utilities for consistent output formatting. */

import { getDefaultLogger } from '@socketsecurity/lib-stable/logger'

const logger = getDefaultLogger()

// Default formatting constants.
const DEFAULT_RULE_WIDTH = 50
const DEFAULT_RULE_CHAR = '─'

interface HeaderOptions {
  emoji?: string | undefined
  ruleChar?: string | undefined
  ruleWidth?: number | undefined
}

/**
 * Format a header title with optional emoji prefix.
 */
export function formatHeaderTitle(title: string, emoji?: string): string {
  return emoji ? `${emoji} ${title}` : title
}

/**
 * Create a horizontal rule of specified width.
 */
export function createHorizontalRule(
  width: number = DEFAULT_RULE_WIDTH,
  char: string = DEFAULT_RULE_CHAR,
): string {
  return char.repeat(width)
}

/**
 * Log a section header with optional emoji and horizontal rule.
 */
export function logSectionHeader(title: string, options?: HeaderOptions): void {
  const {
    emoji,
    ruleChar = DEFAULT_RULE_CHAR,
    ruleWidth = DEFAULT_RULE_WIDTH,
  } = { __proto__: null, ...options } as HeaderOptions

  const header = formatHeaderTitle(title, emoji)
  logger.log('')
  logger.log(`${header}`)
  logger.log(createHorizontalRule(ruleWidth, ruleChar))
}

/**
 * Log a subsection header without horizontal rule.
 */
export function logSubsectionHeader(
  title: string,
  options?: HeaderOptions,
): void {
  const { emoji } = { __proto__: null, ...options } as HeaderOptions
  const header = formatHeaderTitle(title, emoji)
  logger.log('')
  logger.log(`${header}`)
}
