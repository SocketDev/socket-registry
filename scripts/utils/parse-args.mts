/**
 * @fileoverview Simplified argument parsing for build scripts.
 * Uses Node.js built-in util.parseArgs (available in Node 22+).
 *
 * This is intentionally separate from src/argv/parse.ts to avoid circular
 * dependencies where build scripts depend on the built dist output.
 */

import process from 'node:process'
import { parseArgs as nodeParseArgs } from 'node:util'

/**
 * Extract positional arguments from process.argv.
 */
export function getPositionalArgs(startIndex = 2) {
  const args = process.argv.slice(startIndex)
  const positionals = []

  for (let i = 0, { length } = args; i < length; i += 1) {
    const arg = args[i]
    // Stop at first flag.
    if (arg.startsWith('-')) {
      break
    }
    positionals.push(arg)
  }

  return positionals
}

/**
 * Check if a specific flag is present in argv.
 *
 * @example
 * // Pass aliases explicitly — this helper does NOT infer single-char aliases
 * // from the flag name (e.g., hasFlag('verbose') will not match '-v').
 * hasFlag('verbose', ['-v'])
 */
export function hasFlag(
  flag: string,
  aliases: string[] = [],
  argv: string[] = process.argv,
): boolean {
  if (argv.includes(`--${flag}`)) {
    return true
  }
  for (let i = 0, { length } = aliases; i < length; i += 1) {
    const alias = aliases[i]
    if (argv.includes(alias)) {
      return true
    }
  }
  return false
}

/**
 * Parse command-line arguments using Node.js built-in parseArgs.
 * Simplified version for build scripts that don't need yargs-parser features.
 */
export function parseArgs(config = {}) {
  const {
    allowPositionals = true,
    args = process.argv.slice(2),
    options = {},
    strict = false,
  } = config

  try {
    const result = nodeParseArgs({
      args,
      options,
      strict,
      allowPositionals,
    })

    return {
      values: result.values,
      positionals: result.positionals || [],
    }
  } catch (e) {
    // If parsing fails in non-strict mode, return empty values.
    if (!strict) {
      return {
        values: {},
        positionals: args.filter(arg => !arg.startsWith('-')),
      }
    }
    throw e
  }
}
