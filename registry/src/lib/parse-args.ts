/** @fileoverview A typed parseArgs utility that wraps yargs-parser with Node.js parseArgs-like API. */

'use strict'

import yargsParser from '../external/yargs-parser'

/**
 * Yargs parser options interface.
 */
interface YargsOptions {
  boolean?: string[]
  string?: string[]
  array?: string[]
  alias?: Record<string, string | string[]>
  default?: Record<string, unknown>
  'unknown-options-as-args'?: boolean
  'parse-numbers'?: boolean
  'parse-positional-numbers'?: boolean
  'boolean-negation'?: boolean
  'halt-at-non-option'?: boolean
  configuration?: {
    'strip-aliased'?: boolean
    'strip-dashed'?: boolean
  }
  strict?: boolean
}

/**
 * Yargs parser result interface.
 */
interface YargsArguments extends Record<string, unknown> {
  _: string[]
  $0?: string
}

/**
 * Options for configuring argument parsing, similar to Node.js util.parseArgs.
 */
export interface ParseArgsOptionsConfig {
  // Whether the option accepts multiple values (array).
  multiple?: boolean
  // Short alias for the option (single character).
  short?: string
  // Type of the option value.
  type?: 'boolean' | 'string'
  // Default value for the option.
  default?: unknown
}

/**
 * Configuration object for parseArgs function, similar to Node.js util.parseArgs.
 */
export interface ParseArgsConfig {
  // Command-line arguments to parse (defaults to process.argv.slice(2)).
  args?: readonly string[] | undefined
  // Options configuration object.
  options?: Record<string, ParseArgsOptionsConfig> | undefined
  // Whether to throw on unknown options (default: true).
  strict?: boolean | undefined
  // Whether to populate tokens array (not implemented, for API compatibility).
  tokens?: boolean | undefined
  // Whether to allow positional arguments after options.
  allowPositionals?: boolean | undefined
  // Whether to allow negative numbers as option values.
  allowNegative?: boolean | undefined
}

/**
 * Result of parsing command-line arguments.
 */
export interface ParsedArgs<T = Record<string, unknown>> {
  // Parsed option values.
  values: T
  // Positional arguments (non-option arguments).
  positionals: string[]
  // Raw parsed arguments object from yargs-parser.
  raw: YargsArguments
}

/**
 * Parse command-line arguments with a Node.js parseArgs-compatible API.
 * Uses yargs-parser internally for robust argument parsing.
 */
export function parseArgs<T = Record<string, unknown>>(
  config: ParseArgsConfig = {},
): ParsedArgs<T> {
  const {
    allowNegative = false,
    allowPositionals = true,
    args = process.argv.slice(2),
    options = {},
    strict = true,
  } = config

  // Convert parseArgs options to yargs-parser options.
  const yargsOptions: YargsOptions = {
    boolean: [],
    string: [],
    array: [],
    alias: {},
    default: {},
    'unknown-options-as-args': !strict,
    'parse-numbers': false,
    'parse-positional-numbers': false,
    'boolean-negation': !allowNegative,
    'halt-at-non-option': !allowPositionals,
    configuration: {
      'strip-aliased': true,
      'strip-dashed': true,
    },
  }

  // Process each option configuration.
  for (const { 0: key, 1: optionConfig } of Object.entries(options)) {
    const { default: defaultValue, multiple, short, type } = optionConfig

    // Set the option type.
    if (type === 'boolean') {
      yargsOptions.boolean!.push(key)
    } else if (type === 'string') {
      yargsOptions.string!.push(key)
    }

    // Handle multiple values (arrays).
    if (multiple) {
      yargsOptions.array!.push(key)
    }

    // Set short alias.
    if (short) {
      yargsOptions.alias![short] = key
    }

    // Set default value.
    if (defaultValue !== undefined) {
      yargsOptions.default![key] = defaultValue
    }
  }

  // Parse the arguments.
  const parsed = yargsParser(args as string[], yargsOptions)

  // Extract positional arguments.
  const positionals = parsed._ || []

  // Remove the positionals array from values to match Node.js parseArgs behavior.
  const { _, ...values } = parsed

  // Ensure positionals are strings.
  const stringPositionals = positionals.map(String)

  return {
    values: values as T,
    positionals: stringPositionals,
    raw: parsed as YargsArguments,
  }
}

/**
 * Common parseArgs configuration for Socket registry scripts.
 */
export const commonParseArgsConfig: ParseArgsConfig = {
  options: {
    force: {
      type: 'boolean',
      short: 'f',
      default: false,
    },
    quiet: {
      type: 'boolean',
      short: 'q',
      default: false,
    },
  },
  strict: false,
}

export default parseArgs
