/**
 * @fileoverview Shared logging utilities for scripts.
 * Provides consistent console output formatting across all Socket scripts.
 */

import colors from 'yoctocolors-cjs'

/**
 * Console logger with colored status indicators
 */
export const log = {
  info: msg => console.log(msg),
  error: msg => console.error(`${colors.red('✗')} ${msg}`),
  success: msg => console.log(`${colors.green('✓')} ${msg}`),
  warn: msg => console.log(`${colors.yellow('⚠')} ${msg}`),
  step: msg => console.log(`\n${msg}`),
  substep: msg => console.log(`  ${msg}`),
  progress: msg => process.stdout.write(`  ∴ ${msg}`),
  done: msg => {
    process.stdout.write('\r\x1b[K')
    console.log(`  ${colors.green('✓')} ${msg}`)
  },
  failed: msg => {
    process.stdout.write('\r\x1b[K')
    console.log(`  ${colors.red('✗')} ${msg}`)
  }
}

/**
 * Print a section header
 */
export function printHeader(title, width = 60) {
  const separator = '─'.repeat(width)
  console.log(`\n${separator}`)
  console.log(`  ${title}`)
  console.log(separator)
}

/**
 * Print a section footer
 */
export function printFooter(message, width = 60) {
  const separator = '─'.repeat(width)
  console.log(`\n${separator}`)
  if (message) {
    console.log(`  ${colors.green('✓')} ${message}`)
  }
}

/**
 * Check if output should be quiet based on command-line arguments
 */
export function isQuiet(args = process.argv) {
  return args.includes('-q') || args.includes('--quiet')
}

/**
 * Create a progress indicator
 */
export function createProgressIndicator(message) {
  let dotCount = 0
  const interval = setInterval(() => {
    const dots = '.'.repeat(dotCount % 4)
    const spaces = ' '.repeat(3 - dots.length)
    process.stdout.write(`\r  ∴ ${message}${dots}${spaces}`)
    dotCount++
  }, 500)

  return {
    stop(success = true) {
      clearInterval(interval)
      process.stdout.write('\r\x1b[K')
      if (success) {
        log.done(`${message}`)
      } else {
        log.failed(`${message}`)
      }
    }
  }
}