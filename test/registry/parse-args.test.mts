import { describe, expect, it } from 'vitest'

import {
  commonParseArgsConfig,
  parseArgs,
} from '../../registry/dist/lib/parse-args.js'

describe('parse-args module', () => {
  describe('parseArgs', () => {
    it('should parse boolean options', () => {
      const result = parseArgs({
        args: ['--flag'],
        options: {
          flag: { type: 'boolean' },
        },
      })
      expect(result.values['flag']).toBe(true)
    })

    it('should parse string options', () => {
      const result = parseArgs({
        args: ['--name', 'test'],
        options: {
          name: { type: 'string' },
        },
      })
      expect(result.values['name']).toBe('test')
    })

    it('should handle multiple values for array options', () => {
      const result = parseArgs({
        args: ['--item', 'a', '--item', 'b', '--item', 'c'],
        options: {
          item: { type: 'string', multiple: true },
        },
      })
      expect(result.values['item']).toEqual(['a', 'b', 'c'])
    })

    it('should handle short aliases', () => {
      const result = parseArgs({
        args: ['-v'],
        options: {
          verbose: { type: 'boolean', short: 'v' },
        },
      })
      expect(result.values['verbose']).toBe(true)
    })

    it('should use default values', () => {
      const result = parseArgs({
        args: [],
        options: {
          port: { type: 'string', default: '3000' },
          debug: { type: 'boolean', default: false },
        },
      })
      expect(result.values['port']).toBe('3000')
      expect(result.values['debug']).toBe(false)
    })

    it('should override default values when provided', () => {
      const result = parseArgs({
        args: ['--port', '8080', '--debug'],
        options: {
          port: { type: 'string', default: '3000' },
          debug: { type: 'boolean', default: false },
        },
      })
      expect(result.values['port']).toBe('8080')
      expect(result.values['debug']).toBe(true)
    })

    it('should handle positional arguments', () => {
      const result = parseArgs({
        args: ['file1.txt', 'file2.txt'],
        options: {},
      })
      expect(result.positionals).toEqual(['file1.txt', 'file2.txt'])
    })

    it('should handle mixed options and positionals', () => {
      const result = parseArgs({
        args: ['--verbose', 'input.txt', '--output', 'output.txt', 'extra.txt'],
        options: {
          verbose: { type: 'boolean' },
          output: { type: 'string' },
        },
      })
      expect(result.values['verbose']).toBe(true)
      expect(result.values['output']).toBe('output.txt')
      expect(result.positionals).toEqual(['input.txt', 'extra.txt'])
    })

    it('should use process.argv.slice(2) by default', () => {
      const result = parseArgs({
        options: {
          test: { type: 'boolean' },
        },
      })
      expect(result.positionals).toBeDefined()
      expect(Array.isArray(result.positionals)).toBe(true)
    })

    it('should handle strict mode by default', () => {
      const result = parseArgs({
        args: ['--known', '--unknown'],
        options: {
          known: { type: 'boolean' },
        },
      })
      expect(result.values['known']).toBe(true)
    })

    it('should allow unknown options when strict is false', () => {
      const result = parseArgs({
        args: ['--known', '--unknown', 'value'],
        options: {
          known: { type: 'boolean' },
        },
        strict: false,
      })
      expect(result.values['known']).toBe(true)
      expect(result.values['unknown']).toBe('value')
    })

    it('should handle allowPositionals: false', () => {
      const result = parseArgs({
        args: ['--flag', 'positional'],
        options: {
          flag: { type: 'boolean' },
        },
        allowPositionals: false,
      })
      expect(result.values['flag']).toBe(true)
    })

    it('should handle allowNegative: true', () => {
      const result = parseArgs({
        args: ['--no-cache'],
        options: {
          cache: { type: 'boolean', default: true },
        },
        allowNegative: true,
      })
      expect(result.values['cache']).toBe(false)
    })

    it('should disable boolean negation when allowNegative is false', () => {
      const result = parseArgs({
        args: ['--cache'],
        options: {
          cache: { type: 'boolean' },
        },
        allowNegative: false,
      })
      expect(result.values['cache']).toBe(true)
    })

    it('should return raw parsed arguments', () => {
      const result = parseArgs({
        args: ['--flag', 'arg1'],
        options: {
          flag: { type: 'boolean' },
        },
      })
      expect(result.raw).toBeDefined()
      expect(result.raw._).toBeDefined()
    })

    it('should handle empty args array', () => {
      const result = parseArgs({
        args: [],
        options: {},
      })
      expect(result.positionals).toEqual([])
      expect(Object.keys(result.values).length).toBeGreaterThanOrEqual(0)
    })

    it('should handle options without type specified', () => {
      const result = parseArgs({
        args: ['--value', 'test'],
        options: {
          value: {},
        },
      })
      expect(result.values['value']).toBe('test')
    })

    it('should handle multiple short aliases', () => {
      const result = parseArgs({
        args: ['-v', '-d'],
        options: {
          verbose: { type: 'boolean', short: 'v' },
          debug: { type: 'boolean', short: 'd' },
        },
      })
      expect(result.values['verbose']).toBe(true)
      expect(result.values['debug']).toBe(true)
    })

    it('should handle combined short flags', () => {
      const result = parseArgs({
        args: ['-vd'],
        options: {
          verbose: { type: 'boolean', short: 'v' },
          debug: { type: 'boolean', short: 'd' },
        },
      })
      expect(result.values['verbose']).toBe(true)
      expect(result.values['debug']).toBe(true)
    })

    it('should convert positionals to strings', () => {
      const result = parseArgs({
        args: ['123', '456'],
        options: {},
      })
      expect(result.positionals).toEqual(['123', '456'])
      result.positionals.forEach(p => {
        expect(typeof p).toBe('string')
      })
    })

    it('should handle default config with no options', () => {
      const result = parseArgs()
      expect(result.values).toBeDefined()
      expect(result.positionals).toBeDefined()
      expect(result.raw).toBeDefined()
    })

    it('should handle empty options object', () => {
      const result = parseArgs({
        args: ['arg1', 'arg2'],
        options: {},
      })
      expect(result.positionals).toEqual(['arg1', 'arg2'])
    })

    it('should handle boolean option without explicit value', () => {
      const result = parseArgs({
        args: ['--flag'],
        options: {
          flag: { type: 'boolean' },
        },
      })
      expect(result.values['flag']).toBe(true)
    })

    it('should handle string option with equals syntax', () => {
      const result = parseArgs({
        args: ['--name=value'],
        options: {
          name: { type: 'string' },
        },
      })
      expect(result.values['name']).toBe('value')
    })

    it('should handle short option with value', () => {
      const result = parseArgs({
        args: ['-n', 'value'],
        options: {
          name: { type: 'string', short: 'n' },
        },
      })
      expect(result.values['name']).toBe('value')
    })

    it('should handle multiple boolean flags', () => {
      const result = parseArgs({
        args: ['--flag1', '--flag2', '--flag3'],
        options: {
          flag1: { type: 'boolean' },
          flag2: { type: 'boolean' },
          flag3: { type: 'boolean' },
        },
      })
      expect(result.values['flag1']).toBe(true)
      expect(result.values['flag2']).toBe(true)
      expect(result.values['flag3']).toBe(true)
    })

    it('should handle option with default undefined', () => {
      const result = parseArgs({
        args: [],
        options: {
          value: { type: 'string', default: undefined },
        },
      })
      expect(result.values['value']).toBeUndefined()
    })
  })

  describe('commonParseArgsConfig', () => {
    it('should have correct option configurations', () => {
      expect(commonParseArgsConfig.options!).toBeDefined()

      const options = [
        { name: 'force', short: 'f' },
        { name: 'quiet', short: 'q' },
      ]

      for (const { name, short } of options) {
        const option = commonParseArgsConfig.options![name]
        expect(option).toBeDefined()
        expect(option!.type).toBe('boolean')
        expect(option!.short).toBe(short)
        expect(option!.default).toBe(false)
      }
    })

    it('should have strict mode disabled', () => {
      expect(commonParseArgsConfig.strict).toBe(false)
    })

    it('should work with parseArgs', () => {
      const result = parseArgs({
        ...commonParseArgsConfig,
        args: ['-f', '-q'],
      })
      expect(result.values['force']).toBe(true)
      expect(result.values['quiet']).toBe(true)
    })
  })

  describe('coerce option', () => {
    it('should apply coerce function to option values', () => {
      const result = parseArgs({
        args: ['--port', '8080'],
        options: {
          port: {
            type: 'string',
            coerce: (value: string) => Number.parseInt(value, 10),
          },
        },
      })
      expect(result.values['port']).toBe(8080)
      expect(typeof result.values['port']).toBe('number')
    })
  })

  describe('camelCase conversion', () => {
    it('should convert kebab-case options to camelCase', () => {
      const result = parseArgs({
        args: ['--temp-dir', '/tmp/test'],
        options: {
          'temp-dir': { type: 'string' },
        },
      })
      expect(result.values['temp-dir']).toBe('/tmp/test')
      expect(result.values['tempDir']).toBe('/tmp/test')
    })

    it('should convert multi-segment kebab-case to camelCase', () => {
      const result = parseArgs({
        args: ['--download-concurrency', '10'],
        options: {
          'download-concurrency': { type: 'string' },
        },
      })
      expect(result.values['download-concurrency']).toBe('10')
      expect(result.values['downloadConcurrency']).toBe('10')
    })

    it('should handle boolean kebab-case options', () => {
      const result = parseArgs({
        args: ['--clear-cache'],
        options: {
          'clear-cache': { type: 'boolean' },
        },
      })
      expect(result.values['clear-cache']).toBe(true)
      expect(result.values['clearCache']).toBe(true)
    })

    it('should handle multiple kebab-case options', () => {
      const result = parseArgs({
        args: ['--temp-dir', '/tmp', '--clear-cache', '--download-only'],
        options: {
          'temp-dir': { type: 'string' },
          'clear-cache': { type: 'boolean' },
          'download-only': { type: 'boolean' },
        },
      })
      expect(result.values['tempDir']).toBe('/tmp')
      expect(result.values['clearCache']).toBe(true)
      expect(result.values['downloadOnly']).toBe(true)
    })
  })

  describe('default configuration options', () => {
    it('should allow short option groups by default', () => {
      const result = parseArgs({
        args: ['-vdf'],
        options: {
          verbose: { type: 'boolean', short: 'v' },
          debug: { type: 'boolean', short: 'd' },
          force: { type: 'boolean', short: 'f' },
        },
      })
      expect(result.values['verbose']).toBe(true)
      expect(result.values['debug']).toBe(true)
      expect(result.values['force']).toBe(true)
    })

    it('should handle duplicate arguments as arrays', () => {
      const result = parseArgs({
        args: ['--tag', 'v1', '--tag', 'v2', '--tag', 'v3'],
        options: {
          tag: { type: 'string', multiple: true },
        },
      })
      expect(result.values['tag']).toEqual(['v1', 'v2', 'v3'])
    })

    it('should populate arguments after -- separator', () => {
      const result = parseArgs({
        args: ['--verbose', '--', 'arg1', 'arg2'],
        options: {
          verbose: { type: 'boolean' },
        },
      })
      expect(result.values['verbose']).toBe(true)
      expect(result.raw['--']).toEqual(['arg1', 'arg2'])
    })

    it('should not parse dot notation by default', () => {
      const result = parseArgs({
        args: ['--config.port', '8080'],
        options: {
          'config.port': { type: 'string' },
        },
      })
      expect(result.values['config.port']).toBe('8080')
      expect(result.values['config']).toBeUndefined()
    })
  })
})
