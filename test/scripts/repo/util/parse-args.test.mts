import { describe, expect, it } from 'vitest'
import {
  isQuiet,
  parseArgs,
} from '../../../../scripts/repo/util/parse-args.mts'

describe('repository argument parsing', () => {
  it('retains short, dashed, and camel-case keys with grouped flags', () => {
    const result = parseArgs({
      args: ['-qf', '--temp-dir', 'scratch'],
      options: {
        quiet: { type: 'boolean', short: 'q' },
        force: { type: 'boolean', short: 'f' },
        'temp-dir': { type: 'string', short: 't' },
      },
    })
    expect(result.values).toEqual({
      q: true,
      quiet: true,
      f: true,
      force: true,
      'temp-dir': 'scratch',
      tempDir: 'scratch',
      t: 'scratch',
    })
    expect(result.positionals).toEqual([])
  })

  it('collects repeated values, applies defaults, and coerces configured values', () => {
    expect(
      parseArgs({
        args: ['--count', '12', '--tag', 'one', '--tag', 'two'],
        options: {
          count: { type: 'string', coerce: Number },
          tag: { type: 'string', multiple: true },
          quiet: { type: 'boolean', default: false },
        },
      }).values,
    ).toEqual({ count: 12, tag: ['one', 'two'], quiet: false })
  })

  it('keeps separator arguments separate from positional strings', () => {
    const result = parseArgs({
      args: ['123', 'input', '--', '--literal', '-2'],
    })
    expect(result.positionals).toEqual(['123', 'input'])
    expect(result.values).toEqual({ '--': ['--literal', '-2'] })
    expect(result.raw._).toEqual([123, 'input'])
  })

  it('preserves effective Socket defaults for unknown flags, negation, and negative values', () => {
    const result = parseArgs({
      args: ['--no-cache', '--count', '-2', '123', '--unknown'],
      options: { cache: { type: 'boolean' }, count: { type: 'string' } },
      allowNegative: true,
      allowPositionals: false,
      strict: true,
    })
    expect(result.values).toEqual({ cache: false, count: '-2', unknown: true })
    expect(result.positionals).toEqual(['123'])
  })

  it('honors explicit yargs configuration for unknown options and positional numbers', () => {
    const result = parseArgs({
      args: ['001', '--unknown'],
      configuration: {
        'unknown-options-as-args': true,
        'parse-positional-numbers': false,
      },
    })
    expect(result.positionals).toEqual(['001', '--unknown'])
    expect(result.raw._).toEqual(['001', '--unknown'])
    expect(result.values).toEqual({})
  })

  it('keeps dotted names literal and duplicate scalar arguments as arrays', () => {
    expect(
      parseArgs({ args: ['--config.path', 'one', '--config.path', 'two'] })
        .values,
    ).toEqual({ 'config.path': ['one', 'two'] })
  })

  it.each([
    [{ quiet: true }, true],
    [{ silent: true }, true],
    [{ quiet: false, silent: false }, false],
    [{ q: true }, false],
  ])('recognizes parsed quiet values %j', (values, expected) => {
    expect(isQuiet(values)).toBe(expected)
  })
})
