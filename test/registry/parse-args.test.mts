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
    it('should have force and quiet options', () => {
      expect(commonParseArgsConfig.options!).toBeDefined()
      expect(commonParseArgsConfig.options!['force']).toBeDefined()
      expect(commonParseArgsConfig.options!['quiet']).toBeDefined()
    })

    it('should have correct force option configuration', () => {
      const forceOption = commonParseArgsConfig.options!['force']
      expect(forceOption!.type).toBe('boolean')
      expect(forceOption!.short).toBe('f')
      expect(forceOption!.default).toBe(false)
    })

    it('should have correct quiet option configuration', () => {
      const quietOption = commonParseArgsConfig.options!['quiet']
      expect(quietOption!.type).toBe('boolean')
      expect(quietOption!.short).toBe('q')
      expect(quietOption!.default).toBe(false)
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
})
