/** @fileoverview Reusable logging utilities for consistent output formatting. */

// Default formatting constants.
const DEFAULT_RULE_WIDTH = 50
const DEFAULT_RULE_CHAR = '─'

/**
 * Create a horizontal rule of specified width.
 */
export function createHorizontalRule(
  width = DEFAULT_RULE_WIDTH,
  char = DEFAULT_RULE_CHAR,
) {
  return char.repeat(width)
}

/**
 * Format a header title with optional emoji prefix.
 */
function formatHeaderTitle(title, emoji) {
  return emoji ? `${emoji} ${title}` : title
}

/**
 * Log a section header with optional emoji and horizontal rule.
 */
export function logSectionHeader(title, options) {
  const {
    emoji,
    ruleChar = DEFAULT_RULE_CHAR,
    ruleWidth = DEFAULT_RULE_WIDTH,
  } = {
    __proto__: null,
    ...options,
  }

  const header = formatHeaderTitle(title, emoji)
  console.log(`\n${header}`)
  console.log(createHorizontalRule(ruleWidth, ruleChar))
}

/**
 * Log a subsection header without horizontal rule.
 */
export function logSubsectionHeader(title, options) {
  const { emoji } = { __proto__: null, ...options }
  const header = formatHeaderTitle(title, emoji)
  console.log(`\n${header}`)
}
