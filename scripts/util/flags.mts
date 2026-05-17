/**
 * @fileoverview Simplified flag utilities for build scripts.
 *
 * This is intentionally separate from src/argv/flags.ts to avoid circular
 * dependencies where build scripts depend on the built dist output.
 */

import process from 'node:process'

type FlagInput = Record<string, unknown> | string[] | undefined

/**
 * Get the appropriate log level based on flags.
 */
export function getLogLevel(input: FlagInput): string {
  if (isQuiet(input)) {
    return 'silent'
  }
  if (isDebug(input)) {
    return 'debug'
  }
  if (isVerbose(input)) {
    return 'verbose'
  }
  return 'info'
}

export function hasArg(
  input: FlagInput,
  argv: string[],
  matches: string[],
): boolean {
  if (!input) {
    return matches.some(m => argv.includes(m))
  }
  if (Array.isArray(input)) {
    return matches.some(m => input.includes(m))
  }
  return false
}

/**
 * Check if coverage mode is enabled.
 */
export function isCoverage(input: FlagInput): boolean {
  if (hasArg(input, process.argv, ['--coverage', '--cover'])) {
    return true
  }
  if (!input || Array.isArray(input)) {
    return false
  }
  return !!(input['coverage'] || input['cover'])
}

/**
 * Check if debug mode is enabled.
 */
export function isDebug(input: FlagInput): boolean {
  if (hasArg(input, process.argv, ['--debug'])) {
    return true
  }
  if (!input || Array.isArray(input)) {
    return false
  }
  return !!input['debug']
}

/**
 * Check if fix/autofix mode is enabled.
 */
export function isFix(input: FlagInput): boolean {
  if (hasArg(input, process.argv, ['--fix'])) {
    return true
  }
  if (!input || Array.isArray(input)) {
    return false
  }
  return !!input['fix']
}

/**
 * Check if force mode is enabled.
 */
export function isForce(input: FlagInput): boolean {
  if (hasArg(input, process.argv, ['--force'])) {
    return true
  }
  if (!input || Array.isArray(input)) {
    return false
  }
  return !!input['force']
}

/**
 * Check if help flag is set.
 */
export function isHelp(input: FlagInput): boolean {
  if (hasArg(input, process.argv, ['--help', '-h'])) {
    return true
  }
  if (!input || Array.isArray(input)) {
    return false
  }
  return !!input['help']
}

/**
 * Check if quiet/silent mode is enabled.
 */
export function isQuiet(input: FlagInput): boolean {
  if (hasArg(input, process.argv, ['--quiet', '--silent'])) {
    return true
  }
  if (!input || Array.isArray(input)) {
    return false
  }
  return !!(input['quiet'] || input['silent'])
}

/**
 * Check if verbose mode is enabled.
 */
export function isVerbose(input: FlagInput): boolean {
  if (hasArg(input, process.argv, ['--verbose'])) {
    return true
  }
  if (!input || Array.isArray(input)) {
    return false
  }
  return !!input['verbose']
}

/**
 * Check if watch mode is enabled.
 */
export function isWatch(input: FlagInput): boolean {
  if (hasArg(input, process.argv, ['--watch', '-w'])) {
    return true
  }
  if (!input || Array.isArray(input)) {
    return false
  }
  return !!input['watch']
}
