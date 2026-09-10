import { createRequire } from 'node:module'

interface ArgumentOption {
  type?: 'boolean' | 'string' | undefined
  multiple?: boolean | undefined
  short?: string | undefined
  default?: unknown
  coerce?: ((value: unknown) => unknown) | undefined
}

export interface ParseArgsConfig {
  args?: readonly string[] | undefined
  // oxlint-disable-next-line socket/prefer-refined-record -- CLI keys.
  options?: Record<string, ArgumentOption> | undefined
  strict?: boolean | undefined
  tokens?: boolean | undefined
  allowPositionals?: boolean | undefined
  allowNegative?: boolean | undefined
  configuration?: Record<string, boolean | string> | undefined
}

interface ParserState {
  boolean: string[]
  string: string[]
  array: string[]
  alias: Record<string, string>
  default: Record<string, unknown>
  coerce: Record<string, (value: unknown) => unknown>
  configuration: Record<string, boolean | string>
  'unknown-options-as-args': boolean
  'parse-numbers': boolean
  'parse-positional-numbers': boolean
  'boolean-negation': boolean
  'halt-at-non-option': boolean
}

interface ParserArguments extends Record<string, unknown> {
  _: Array<string | number>
}

const require = createRequire(import.meta.url)
const yargsParser = require('yargs-parser') as (
  args: readonly string[],
  options: ParserState,
) => ParserArguments

function configureArgumentOptions(
  options: NonNullable<ParseArgsConfig['options']>,
  parser: ParserState,
) {
  for (const [name, option] of Object.entries(options)) {
    if (option.type === 'boolean') {
      parser.boolean.push(name)
    } else if (option.type === 'string') {
      parser.string.push(name)
    }
    if (option.multiple) {
      parser.array.push(name)
    }
    if (option.short) {
      parser.alias[option.short] = name
    }
    if (option.default !== undefined) {
      parser.default[name] = option.default
    }
    if (option.coerce) {
      parser.coerce[name] = option.coerce
    }
  }
}

export function parseArgs<T = Record<string, unknown>>(
  config: ParseArgsConfig = {},
): {
  values: T
  positionals: string[]
  raw: ParserArguments
} {
  const opts = { __proto__: null, ...config } as ParseArgsConfig
  const parser: ParserState = {
    boolean: [],
    string: [],
    array: [],
    alias: {},
    default: {},
    coerce: {},
    'unknown-options-as-args': !(opts.strict ?? true),
    'parse-numbers': false,
    'parse-positional-numbers': false,
    'boolean-negation': !(opts.allowNegative ?? false),
    'halt-at-non-option': !(opts.allowPositionals ?? true),
    configuration: {
      'camel-case-expansion': true,
      'dot-notation': false,
      'duplicate-arguments-array': true,
      'flatten-duplicate-arrays': true,
      'populate--': true,
      'short-option-groups': true,
      'strip-aliased': false,
      'strip-dashed': false,
      ...opts.configuration,
    },
  }
  configureArgumentOptions(opts.options ?? {}, parser)
  const raw = yargsParser(opts.args ?? process.argv.slice(2), parser)
  const { _: positionals, ...values } = raw
  const result = {
    __proto__: null,
    values: values as T,
    positionals: positionals.map(String),
    raw,
  }
  return result
}

export function isQuiet(values: Record<string, unknown>): boolean {
  return Boolean(values['quiet'] || values['silent'])
}
