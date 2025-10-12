/**
 * @fileoverview Unified CLI helper utilities for consistent output.
 * Standardized across all socket-* repositories.
 */

import yoctocolors from 'yoctocolors-cjs'

// Parse command line flags
export const isQuiet = () => process.argv.includes('--quiet')
export const isVerbose = () => process.argv.includes('--verbose')

// Divider helpers
export const printDivider = (char = '═') => console.log(char.repeat(55))
export const printFooterLine = () => console.log('─'.repeat(55))

// Header and footer
export const printHeader = title => {
  printDivider()
  console.log(`  ${title}`)
  printDivider()
}

export const printFooter = () => {
  printFooterLine()
}

// Status messages with consistent formatting
export const printSuccess = message => {
  console.log(`${yoctocolors.green('✓')} ${message}`)
}

export const printError = message => {
  console.error(`${yoctocolors.red('✗')} ${yoctocolors.red(message)}`)
}

export const printWarning = message => {
  console.warn(`${yoctocolors.yellow('⚠')} ${yoctocolors.yellow(message)}`)
}

// Progress indicator utilities
export const log = {
  // Progress indicator that can be cleared
  progress: message => {
    process.stdout.write(`∴ ${message}`)
  },

  // Info message (not clearable)
  info: message => {
    console.log(`ℹ ${message}`)
  },

  // Success indicator for sub-tasks
  done: message => {
    console.log(`${yoctocolors.green('✓')} ${message}`)
  },

  // Failure indicator for sub-tasks
  failed: message => {
    console.error(`${yoctocolors.red('✗')} ${message}`)
  },

  // Warning for sub-tasks
  warn: message => {
    console.warn(`${yoctocolors.yellow('⚠')} ${message}`)
  },
}

// Clear the current line (useful after progress indicators)
export const clearLine = () => {
  process.stdout.write('\r\x1b[K')
}