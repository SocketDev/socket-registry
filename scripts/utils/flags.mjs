/**
 * @fileoverview Simplified flag utilities for build scripts.
 *
 * This is intentionally separate from src/argv/flags.ts to avoid circular
 * dependencies where build scripts depend on the built dist output.
 */

/**
 * Check if quiet/silent mode is enabled.
 *
 * @param {object|string[]|undefined} input - Parsed values, argv array, or undefined
 * @returns {boolean}
 */
export function isQuiet(input) {
  if (!input) {
    return process.argv.includes('--quiet') || process.argv.includes('--silent')
  }
  if (Array.isArray(input)) {
    return input.includes('--quiet') || input.includes('--silent')
  }
  return !!(input.quiet || input.silent)
}

/**
 * Check if verbose mode is enabled.
 *
 * @param {object|string[]|undefined} input - Parsed values, argv array, or undefined
 * @returns {boolean}
 */
export function isVerbose(input) {
  if (!input) {
    return process.argv.includes('--verbose')
  }
  if (Array.isArray(input)) {
    return input.includes('--verbose')
  }
  return !!input.verbose
}

/**
 * Check if debug mode is enabled.
 *
 * @param {object|string[]|undefined} input - Parsed values, argv array, or undefined
 * @returns {boolean}
 */
export function isDebug(input) {
  if (!input) {
    return process.argv.includes('--debug')
  }
  if (Array.isArray(input)) {
    return input.includes('--debug')
  }
  return !!input.debug
}

/**
 * Check if help flag is set.
 *
 * @param {object|string[]|undefined} input - Parsed values, argv array, or undefined
 * @returns {boolean}
 */
export function isHelp(input) {
  if (!input) {
    return process.argv.includes('--help') || process.argv.includes('-h')
  }
  if (Array.isArray(input)) {
    return input.includes('--help') || input.includes('-h')
  }
  return !!input.help
}

/**
 * Check if watch mode is enabled.
 *
 * @param {object|string[]|undefined} input - Parsed values, argv array, or undefined
 * @returns {boolean}
 */
export function isWatch(input) {
  if (!input) {
    return process.argv.includes('--watch') || process.argv.includes('-w')
  }
  if (Array.isArray(input)) {
    return input.includes('--watch') || input.includes('-w')
  }
  return !!input.watch
}

/**
 * Check if force mode is enabled.
 *
 * @param {object|string[]|undefined} input - Parsed values, argv array, or undefined
 * @returns {boolean}
 */
export function isForce(input) {
  if (!input) {
    return process.argv.includes('--force')
  }
  if (Array.isArray(input)) {
    return input.includes('--force')
  }
  return !!input.force
}

/**
 * Check if fix/autofix mode is enabled.
 *
 * @param {object|string[]|undefined} input - Parsed values, argv array, or undefined
 * @returns {boolean}
 */
export function isFix(input) {
  if (!input) {
    return process.argv.includes('--fix')
  }
  if (Array.isArray(input)) {
    return input.includes('--fix')
  }
  return !!input.fix
}

/**
 * Check if coverage mode is enabled.
 *
 * @param {object|string[]|undefined} input - Parsed values, argv array, or undefined
 * @returns {boolean}
 */
export function isCoverage(input) {
  if (!input) {
    return (
      process.argv.includes('--coverage') || process.argv.includes('--cover')
    )
  }
  if (Array.isArray(input)) {
    return input.includes('--coverage') || input.includes('--cover')
  }
  return !!(input.coverage || input.cover)
}

/**
 * Get the appropriate log level based on flags.
 *
 * @param {object|string[]|undefined} input - Parsed values, argv array, or undefined
 * @returns {string} One of: 'silent', 'error', 'warn', 'info', 'verbose', 'debug'
 */
export function getLogLevel(input) {
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
