/**
 * @fileoverview Tests for argv/flags utility functions.
 * Covers all flag checking functions and common flag utilities.
 */

import {
  COMMON_FLAGS,
  type FlagValues,
  getLogLevel,
  isAll,
  isChanged,
  isCoverage,
  isDebug,
  isDryRun,
  isFix,
  isForce,
  isHelp,
  isJson,
  isQuiet,
  isStaged,
  isUpdate,
  isVerbose,
  isWatch,
} from '@socketsecurity/lib/argv/flags'
import {
  getPositionalArgs,
  parseArgs,
  parseArgsWithDefaults,
} from '@socketsecurity/lib/argv/parse'
import { describe, expect, it } from 'vitest'

describe('argv/flags module', () => {
  describe('flag checking functions', () => {
    describe('isAll', () => {
      it('should detect --all flag from array', () => {
        expect(isAll(['--all'])).toBe(true)
        expect(isAll(['--other'])).toBe(false)
      })

      it('should detect all flag from FlagValues object', () => {
        expect(isAll({ all: true })).toBe(true)
        expect(isAll({ all: false })).toBe(false)
      })

      it('should handle undefined input', () => {
        const result = isAll(undefined)
        expect(typeof result).toBe('boolean')
      })
    })

    describe('isChanged', () => {
      it('should detect --changed flag from array', () => {
        expect(isChanged(['--changed'])).toBe(true)
        expect(isChanged(['--other'])).toBe(false)
      })

      it('should detect changed flag from FlagValues object', () => {
        expect(isChanged({ changed: true })).toBe(true)
        expect(isChanged({ changed: false })).toBe(false)
      })
    })

    describe('isCoverage', () => {
      it('should detect --coverage flag from array', () => {
        expect(isCoverage(['--coverage'])).toBe(true)
      })

      it('should detect --cover flag from array', () => {
        expect(isCoverage(['--cover'])).toBe(true)
      })

      it('should detect coverage flag from FlagValues object', () => {
        expect(isCoverage({ coverage: true })).toBe(true)
        expect(isCoverage({ cover: true })).toBe(true)
        expect(isCoverage({ coverage: false, cover: false })).toBe(false)
      })
    })

    describe('isDebug', () => {
      it('should detect --debug flag from array', () => {
        expect(isDebug(['--debug'])).toBe(true)
        expect(isDebug(['--other'])).toBe(false)
      })

      it('should detect debug flag from FlagValues object', () => {
        expect(isDebug({ debug: true })).toBe(true)
        expect(isDebug({ debug: false })).toBe(false)
      })
    })

    describe('isDryRun', () => {
      it('should detect --dry-run flag from array', () => {
        expect(isDryRun(['--dry-run'])).toBe(true)
        expect(isDryRun(['--other'])).toBe(false)
      })

      it('should detect dry-run flag from FlagValues object', () => {
        expect(isDryRun({ 'dry-run': true })).toBe(true)
        expect(isDryRun({ 'dry-run': false })).toBe(false)
      })
    })

    describe('isFix', () => {
      it('should detect --fix flag from array', () => {
        expect(isFix(['--fix'])).toBe(true)
        expect(isFix(['--other'])).toBe(false)
      })

      it('should detect fix flag from FlagValues object', () => {
        expect(isFix({ fix: true })).toBe(true)
        expect(isFix({ fix: false })).toBe(false)
      })
    })

    describe('isForce', () => {
      it('should detect --force flag from array', () => {
        expect(isForce(['--force'])).toBe(true)
        expect(isForce(['--other'])).toBe(false)
      })

      it('should detect force flag from FlagValues object', () => {
        expect(isForce({ force: true })).toBe(true)
        expect(isForce({ force: false })).toBe(false)
      })
    })

    describe('isHelp', () => {
      it('should detect --help flag from array', () => {
        expect(isHelp(['--help'])).toBe(true)
      })

      it('should detect -h flag from array', () => {
        expect(isHelp(['-h'])).toBe(true)
      })

      it('should detect help flag from FlagValues object', () => {
        expect(isHelp({ help: true })).toBe(true)
        expect(isHelp({ help: false })).toBe(false)
      })
    })

    describe('isJson', () => {
      it('should detect --json flag from array', () => {
        expect(isJson(['--json'])).toBe(true)
        expect(isJson(['--other'])).toBe(false)
      })

      it('should detect json flag from FlagValues object', () => {
        expect(isJson({ json: true })).toBe(true)
        expect(isJson({ json: false })).toBe(false)
      })
    })

    describe('isQuiet', () => {
      it('should detect --quiet flag from array', () => {
        expect(isQuiet(['--quiet'])).toBe(true)
      })

      it('should detect --silent flag from array', () => {
        expect(isQuiet(['--silent'])).toBe(true)
      })

      it('should detect quiet/silent flag from FlagValues object', () => {
        expect(isQuiet({ quiet: true })).toBe(true)
        expect(isQuiet({ silent: true })).toBe(true)
        expect(isQuiet({ quiet: false, silent: false })).toBe(false)
      })
    })

    describe('isStaged', () => {
      it('should detect --staged flag from array', () => {
        expect(isStaged(['--staged'])).toBe(true)
        expect(isStaged(['--other'])).toBe(false)
      })

      it('should detect staged flag from FlagValues object', () => {
        expect(isStaged({ staged: true })).toBe(true)
        expect(isStaged({ staged: false })).toBe(false)
      })
    })

    describe('isUpdate', () => {
      it('should detect --update flag from array', () => {
        expect(isUpdate(['--update'])).toBe(true)
      })

      it('should detect -u flag from array', () => {
        expect(isUpdate(['-u'])).toBe(true)
      })

      it('should detect update flag from FlagValues object', () => {
        expect(isUpdate({ update: true })).toBe(true)
        expect(isUpdate({ update: false })).toBe(false)
      })
    })

    describe('isVerbose', () => {
      it('should detect --verbose flag from array', () => {
        expect(isVerbose(['--verbose'])).toBe(true)
        expect(isVerbose(['--other'])).toBe(false)
      })

      it('should detect verbose flag from FlagValues object', () => {
        expect(isVerbose({ verbose: true })).toBe(true)
        expect(isVerbose({ verbose: false })).toBe(false)
      })
    })

    describe('isWatch', () => {
      it('should detect --watch flag from array', () => {
        expect(isWatch(['--watch'])).toBe(true)
      })

      it('should detect -w flag from array', () => {
        expect(isWatch(['-w'])).toBe(true)
      })

      it('should detect watch flag from FlagValues object', () => {
        expect(isWatch({ watch: true })).toBe(true)
        expect(isWatch({ watch: false })).toBe(false)
      })
    })
  })

  describe('getLogLevel', () => {
    it('should return "silent" for quiet/silent flags', () => {
      expect(getLogLevel({ quiet: true })).toBe('silent')
      expect(getLogLevel({ silent: true })).toBe('silent')
      expect(getLogLevel(['--quiet'])).toBe('silent')
    })

    it('should return "debug" for debug flag', () => {
      expect(getLogLevel({ debug: true })).toBe('debug')
      expect(getLogLevel(['--debug'])).toBe('debug')
    })

    it('should return "verbose" for verbose flag', () => {
      expect(getLogLevel({ verbose: true })).toBe('verbose')
      expect(getLogLevel(['--verbose'])).toBe('verbose')
    })

    it('should return "info" by default', () => {
      expect(getLogLevel({})).toBe('info')
      expect(getLogLevel([])).toBe('info')
    })

    it('should prioritize quiet over other flags', () => {
      expect(getLogLevel({ quiet: true, debug: true, verbose: true })).toBe(
        'silent',
      )
    })

    it('should prioritize debug over verbose', () => {
      expect(getLogLevel({ debug: true, verbose: true })).toBe('debug')
    })
  })

  describe('COMMON_FLAGS', () => {
    it('should have all expected flag definitions', () => {
      const expectedFlags = [
        'all',
        'changed',
        'coverage',
        'cover',
        'debug',
        'dry-run',
        'fix',
        'force',
        'help',
        'json',
        'quiet',
        'silent',
        'staged',
        'update',
        'verbose',
        'watch',
      ]

      for (const flag of expectedFlags) {
        expect(COMMON_FLAGS).toHaveProperty(flag)
        expect(COMMON_FLAGS[flag as keyof typeof COMMON_FLAGS]).toBeDefined()
      }
    })

    it('should have correct types for all flags', () => {
      for (const flag of Object.keys(COMMON_FLAGS)) {
        const flagKey = flag as keyof typeof COMMON_FLAGS
        expect(COMMON_FLAGS[flagKey]['type']).toBe('boolean')
        expect(COMMON_FLAGS[flagKey]['default']).toBe(false)
      }
    })

    it('should have short aliases for specific flags', () => {
      expect(COMMON_FLAGS.help.short).toBe('h')
      expect(COMMON_FLAGS.quiet.short).toBe('q')
      expect(COMMON_FLAGS.update.short).toBe('u')
      expect(COMMON_FLAGS.verbose.short).toBe('v')
      expect(COMMON_FLAGS.watch.short).toBe('w')
    })

    it('should have descriptions for all flags', () => {
      for (const flag of Object.keys(COMMON_FLAGS)) {
        const flagKey = flag as keyof typeof COMMON_FLAGS
        expect(COMMON_FLAGS[flagKey].description).toBeDefined()
        expect(typeof COMMON_FLAGS[flagKey].description).toBe('string')
        expect(COMMON_FLAGS[flagKey].description.length).toBeGreaterThan(0)
      }
    })

    it('should work with parseArgs', () => {
      const result = parseArgs({
        args: ['--verbose', '--force'],
        options: COMMON_FLAGS,
      })
      expect(result.values['verbose']).toBe(true)
      expect(result.values['force']).toBe(true)
    })
  })

  describe('parseArgsWithDefaults', () => {
    it('should parse args with Socket defaults', () => {
      const result = parseArgsWithDefaults({
        args: ['--flag', 'value'],
        options: {
          flag: { type: 'string' },
        },
      })
      expect(result.values['flag']).toBe('value')
    })

    it('should have strict mode disabled by default', () => {
      const result = parseArgsWithDefaults({
        args: ['--known', '--unknown'],
        options: {
          known: { type: 'boolean' },
        },
      })
      expect(result.values['known']).toBe(true)
      // Should not throw for unknown flag due to strict: false
    })

    it('should allow positionals by default', () => {
      const result = parseArgsWithDefaults({
        args: ['file1.txt', 'file2.txt'],
        options: {},
      })
      expect(result.positionals).toEqual(['file1.txt', 'file2.txt'])
    })

    it('should allow config overrides', () => {
      // Test that we can override the defaults
      // Override default strict: false
      const result = parseArgsWithDefaults({
        args: ['--test'],
        options: {
          test: { type: 'boolean' },
        },
        strict: true,
      })
      expect(result).toBeDefined()
      expect(result.values['test']).toBe(true)
    })
  })

  describe('getPositionalArgs', () => {
    it('should extract positional args before flags', () => {
      // Mock process.argv
      const originalArgv = process.argv
      process.argv = ['node', 'script.js', 'file1.txt', 'file2.txt', '--flag']

      const result = getPositionalArgs()
      expect(result).toEqual(['file1.txt', 'file2.txt'])

      process.argv = originalArgv
    })

    it('should handle no positional args', () => {
      const originalArgv = process.argv
      process.argv = ['node', 'script.js', '--flag', 'value']

      const result = getPositionalArgs()
      expect(result).toEqual([])

      process.argv = originalArgv
    })

    it('should accept custom start index', () => {
      const originalArgv = process.argv
      process.argv = ['node', 'script.js', 'skip', 'file1.txt', '--flag']

      const result = getPositionalArgs(3)
      expect(result).toEqual(['file1.txt'])

      process.argv = originalArgv
    })

    it('should handle empty argv', () => {
      const originalArgv = process.argv
      process.argv = ['node', 'script.js']

      const result = getPositionalArgs()
      expect(result).toEqual([])

      process.argv = originalArgv
    })

    it('should stop at first flag', () => {
      const originalArgv = process.argv
      process.argv = [
        'node',
        'script.js',
        'file1.txt',
        '-f',
        'file2.txt',
        '--flag',
      ]

      const result = getPositionalArgs()
      expect(result).toEqual(['file1.txt'])

      process.argv = originalArgv
    })
  })

  describe('integration tests', () => {
    it('should work with parseArgs and flag checkers together', () => {
      const result = parseArgs({
        args: ['--verbose', '--coverage', 'file.txt'],
        options: COMMON_FLAGS,
        strict: false,
        allowPositionals: true,
      })

      expect(isVerbose(result.values as FlagValues)).toBe(true)
      expect(isCoverage(result.values as FlagValues)).toBe(true)
      expect(result.positionals).toEqual(['file.txt'])
      expect(getLogLevel(result.values as FlagValues)).toBe('verbose')
    })

    it('should handle multiple flag input types consistently', () => {
      const flags: FlagValues = { debug: true, force: true }
      const argv = ['--debug', '--force']

      expect(isDebug(flags)).toBe(true)
      expect(isDebug(argv)).toBe(true)

      expect(isForce(flags)).toBe(true)
      expect(isForce(argv)).toBe(true)
    })

    it('should handle complex flag combinations', () => {
      const result = parseArgs({
        args: ['-v', '-q', '--coverage', '--dry-run', 'input.txt'],
        options: COMMON_FLAGS,
        strict: false,
        allowPositionals: true,
      })

      expect(isVerbose(result.values as FlagValues)).toBe(true)
      expect(isQuiet(result.values as FlagValues)).toBe(true)
      expect(isCoverage(result.values as FlagValues)).toBe(true)
      expect(isDryRun(result.values as FlagValues)).toBe(true)
      expect(result.positionals).toEqual(['input.txt'])
    })
  })
})
