/**
 * Common CLI output utilities for Socket projects.
 * Provides consistent console output formatting across all Socket CLIs.
 */

import colors from '../../external/yoctocolors-cjs'
import { createFooter } from '../stdio/footer'
import { createHeader, createSectionHeader } from '../stdio/header'

/**
 * Console logging utilities.
 */
export const log = {
  info: (msg: string) => console.log(msg),
  error: (msg: string) => console.error(`${colors.red('✗')} ${msg}`),
  success: (msg: string) => console.log(`${colors.green('✓')} ${msg}`),
  warn: (msg: string) => console.log(`${colors.yellow('⚠')} ${msg}`),
  step: (msg: string) => console.log(`\n${msg}`),
  // Alias for backward compatibility.
  substep: (msg: string) => console.log(`  ${msg}`),
  // Customizable indent.
  indent: (msg: string, spaces = 2) =>
    console.log(`${' '.repeat(spaces)}${msg}`),
  progress: (msg: string) => {
    process.stdout.write(`  ∴ ${msg}`)
  },
  done: (msg: string) => {
    process.stdout.write('\r\x1b[K')
    console.log(`  ${colors.green('✓')} ${msg}`)
  },
  failed: (msg: string) => {
    process.stdout.write('\r\x1b[K')
    console.log(`  ${colors.red('✗')} ${msg}`)
  },
}

/**
 * Print divider line.
 */
export function printDivider(): void {
  console.log('═══════════════════════════════════════════════════════')
}

/**
 * Print header with divider.
 */
export function printHeader(title: string): void {
  console.log(createHeader(title, { width: 56, borderChar: '═' }))
}

/**
 * Print footer with divider.
 */
export function printFooter(message: string, success = true): void {
  console.log('')
  const color = success ? 'green' : 'red'
  const prefix = success ? '✓ ' : '✗ '
  console.log(
    createFooter(`${prefix}${message}`, { width: 56, borderChar: '═', color }),
  )
}

/**
 * Print help header.
 */
export function printHelpHeader(name: string): void {
  console.log(
    createSectionHeader(name, { width: 56, borderChar: '-', color: 'cyan' }),
  )
}

/**
 * Exit with code.
 */
export function exit(code = 0): void {
  process.exitCode = code
  if (code !== 0) {
    throw new Error('Script failed')
  }
}
