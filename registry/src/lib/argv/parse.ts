/**
 * Argument parsing utilities for CLI applications.
 * Re-exports Node.js parseArgs with additional Socket-specific functionality.
 */

import { parseArgs as nodeParseArgs } from 'node:util'

export type { ParseArgsConfig } from 'node:util'
export { parseArgs } from 'node:util'

/**
 * Parse command-line arguments with Socket defaults.
 * Provides sensible defaults for Socket CLI applications.
 */
export function parseArgsWithDefaults(
  config?: Parameters<typeof nodeParseArgs>[0],
): ReturnType<typeof nodeParseArgs> {
  return nodeParseArgs({
    strict: false,
    allowPositionals: true,
    ...config,
  })
}

/**
 * Extract positional arguments from process.argv.
 * Useful for commands that accept file paths or other positional parameters.
 */
export function getPositionalArgs(startIndex = 2): string[] {
  const args = process.argv.slice(startIndex)
  const positionals: string[] = []
  let i = 0

  while (i < args.length) {
    // biome-ignore lint/style/noNonNullAssertion: Loop condition ensures index is within bounds.
    const arg = args[i]!
    // Stop at first flag
    if (arg.startsWith('-')) {
      break
    }
    positionals.push(arg)
    i++
  }

  return positionals
}

/**
 * Check if a specific flag is present in argv.
 */
export function hasFlag(flag: string, argv = process.argv): boolean {
  const flagVariants = [
    `--${flag}`,
    // Short flag.
    `-${flag.charAt(0)}`,
  ]
  return flagVariants.some(variant => argv.includes(variant))
}
