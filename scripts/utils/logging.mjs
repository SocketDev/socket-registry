/** @fileoverview Reusable logging utilities for consistent output formatting. */

/**
 * Create a horizontal rule of specified width.
 */
export function createHorizontalRule(width = 50, char = '─') {
  return char.repeat(width)
}

/**
 * Log a section header with optional emoji and horizontal rule.
 */
export function logSectionHeader(title, options) {
  const {
    emoji,
    ruleChar = '─',
    ruleWidth = 50,
  } = {
    __proto__: null,
    ...options,
  }

  const header = emoji ? `${emoji} ${title}` : title
  console.log(`\n${header}`)
  console.log(createHorizontalRule(ruleWidth, ruleChar))
}

/**
 * Log a subsection header without horizontal rule.
 */
export function logSubsectionHeader(title, options) {
  const { emoji } = { __proto__: null, ...options }
  const header = emoji ? `${emoji} ${title}` : title
  console.log(`\n${header}`)
}
