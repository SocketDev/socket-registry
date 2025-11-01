/**
 * @fileoverview Common utilities shared across all scripts.
 */

import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { getDefaultLogger } from '@socketsecurity/lib/logger'

import colors from 'yoctocolors-cjs'

const logger = getDefaultLogger()

// Get root path.
export const getRootPath = importMetaUrl => {
  const __dirname = path.dirname(fileURLToPath(importMetaUrl))
  return path.join(__dirname, '..')
}

// Simple print utilities for scripts - avoid re-exporting from lib.

export const printDivider = (char = '═') => logger.log(char.repeat(55))
export const printHeader = title => {
  printDivider()
  logger.log(`  ${title}`)
  printDivider()
}
export const printCompletedHeader = title =>
  logger.log(colors.green(`✓ ${title}`))
export const printFooterLine = () => logger.log('─'.repeat(55))
export const printDottedLine = () => logger.log('·'.repeat(55))
export const printDiamondLine = () => logger.log('◆'.repeat(55))
export const printFooter = msg => {
  printFooterLine()
  if (msg) {
    logger.log(colors.green(msg))
  }
}
export const printHelpHeader = name => logger.log(`Socket Registry ${name}`)
export const printSuccess = msg => logger.log(`${colors.green('✓')} ${msg}`)
export const printError = msg => logger.error(`${colors.red('✗')} ${msg}`)
export const printWarning = msg => logger.warn(`${colors.yellow('⚠')} ${msg}`)
export const printInfo = msg => logger.log(`${colors.blue('ℹ')} ${msg}`)
export const printIndented = (msg, indent = 2) =>
  logger.log(' '.repeat(indent) + msg)

// Console logging utilities with special formatting.
// These have different behavior than the print utilities above.
export const log = {
  info: msg => logger.log(msg),
  error: msg => printError(msg),
  success: msg => printSuccess(msg),
  warn: msg => printWarning(msg),
  step: msg => logger.log(`\n${msg}`),
  substep: msg => logger.log(`  ${msg}`),
  progress: msg => {
    process.stdout.write(`  ∴ ${msg}`)
  },
  done: msg => {
    process.stdout.write('\r\x1b[K')
    logger.log(`  ${colors.green('✓')} ${msg}`)
  },
  failed: msg => {
    process.stdout.write('\r\x1b[K')
    logger.log(`  ${colors.red('✗')} ${msg}`)
  },
}

// Local argv utilities for scripts - avoid dependency on dist.
const argv = process.argv.slice(2)
export const isQuiet = () => argv.includes('--quiet') || argv.includes('-q')
export const isVerbose = () => argv.includes('--verbose') || argv.includes('-v')
export const isForced = () => argv.includes('--force') || argv.includes('-f')
export const isDryRun = () => argv.includes('--dry-run')
export const COMMON_SCRIPT_FLAGS = [
  '--quiet',
  '--verbose',
  '--force',
  '--dry-run',
]
export const getCommonScriptFlags = () =>
  argv.filter(arg => COMMON_SCRIPT_FLAGS.includes(arg))

// Exit with code.
export function exit(code = 0) {
  process.exitCode = code
  if (code !== 0) {
    throw new Error('Script failed')
  }
}
