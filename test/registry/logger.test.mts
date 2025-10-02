import { Writable } from 'node:stream'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  LOG_SYMBOLS,
  Logger,
  incLogCallCountSymbol,
  lastWasBlankSymbol,
  logger,
} from '../../registry/dist/lib/logger.js'

describe('logger module', () => {
  let mockStdout: Writable
  let mockStderr: Writable
  let stdoutData: string[]
  let stderrData: string[]

  beforeEach(() => {
    stdoutData = []
    stderrData = []
    mockStdout = new Writable({
      write(chunk: any, _encoding: any, callback: any) {
        stdoutData.push(chunk.toString())
        callback()
      },
    })
    mockStderr = new Writable({
      write(chunk: any, _encoding: any, callback: any) {
        stderrData.push(chunk.toString())
        callback()
      },
    })
    // Add TTY properties for testing.
    ;(mockStdout as any).isTTY = true
    ;(mockStderr as any).isTTY = true
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('LOG_SYMBOLS', () => {
    it('should have fail symbol', () => {
      expect(typeof LOG_SYMBOLS.fail).toBe('string')
      expect(LOG_SYMBOLS.fail.length).toBeGreaterThan(0)
    })

    it('should have info symbol', () => {
      expect(typeof LOG_SYMBOLS.info).toBe('string')
      expect(LOG_SYMBOLS.info.length).toBeGreaterThan(0)
    })

    it('should have success symbol', () => {
      expect(typeof LOG_SYMBOLS.success).toBe('string')
      expect(LOG_SYMBOLS.success.length).toBeGreaterThan(0)
    })

    it('should have warn symbol', () => {
      expect(typeof LOG_SYMBOLS.warn).toBe('string')
      expect(LOG_SYMBOLS.warn.length).toBeGreaterThan(0)
    })

    it('should be frozen', () => {
      expect(Object.isFrozen(LOG_SYMBOLS)).toBe(true)
    })
  })

  describe('Logger', () => {
    let testLogger: Logger

    beforeEach(() => {
      testLogger = new Logger({
        stdout: mockStdout,
        stderr: mockStderr,
      })
    })

    describe('constructor', () => {
      it('should create logger with default streams', () => {
        const defaultLogger = new Logger()
        expect(defaultLogger).toBeInstanceOf(Logger)
      })

      it('should create logger with custom streams', () => {
        expect(testLogger).toBeInstanceOf(Logger)
      })
    })

    describe('log', () => {
      it('should log messages to stdout', () => {
        testLogger.log('test message')
        expect(stdoutData.join('')).toContain('test message')
      })

      it('should support multiple arguments', () => {
        testLogger.log('message', 'arg1', 'arg2')
        expect(stdoutData.join('')).toContain('message')
      })

      it('should increment log call count', () => {
        const before = testLogger.logCallCount
        testLogger.log('test')
        expect(testLogger.logCallCount).toBe(before + 1)
      })

      it('should return this for chaining', () => {
        const result = testLogger.log('test')
        expect(result).toBe(testLogger)
      })

      it('should apply indentation to log messages', () => {
        testLogger.indent(2).log('indented')
        expect(stdoutData.join('')).toMatch(/^\s+indented/)
      })
    })

    describe('error', () => {
      it('should log error messages to stderr', () => {
        testLogger.error('error message')
        expect(stderrData.join('')).toContain('error message')
      })

      it('should increment log call count', () => {
        const before = testLogger.logCallCount
        testLogger.error('test')
        expect(testLogger.logCallCount).toBe(before + 1)
      })

      it('should return this for chaining', () => {
        const result = testLogger.error('test')
        expect(result).toBe(testLogger)
      })
    })

    describe('info', () => {
      it('should log info messages with symbol to stderr', () => {
        testLogger.info('info message')
        const output = stderrData.join('')
        expect(output).toContain('info message')
      })

      it('should use LOG_SYMBOLS.info', () => {
        testLogger.info('test')
        const output = stderrData.join('')
        expect(output).toBeTruthy()
      })

      it('should increment log call count', () => {
        const before = testLogger.logCallCount
        testLogger.info('test')
        expect(testLogger.logCallCount).toBe(before + 1)
      })
    })

    describe('warn', () => {
      it('should log warning messages with symbol to stderr', () => {
        testLogger.warn('warning message')
        const output = stderrData.join('')
        expect(output).toContain('warning message')
      })

      it('should increment log call count', () => {
        const before = testLogger.logCallCount
        testLogger.warn('test')
        expect(testLogger.logCallCount).toBe(before + 1)
      })
    })

    describe('fail', () => {
      it('should log fail messages with symbol to stderr', () => {
        testLogger.fail('fail message')
        const output = stderrData.join('')
        expect(output).toContain('fail message')
      })

      it('should increment log call count', () => {
        const before = testLogger.logCallCount
        testLogger.fail('test')
        expect(testLogger.logCallCount).toBe(before + 1)
      })
    })

    describe('success', () => {
      it('should log success messages with symbol to stderr', () => {
        testLogger.success('success message')
        const output = stderrData.join('')
        expect(output).toContain('success message')
      })

      it('should increment log call count', () => {
        const before = testLogger.logCallCount
        testLogger.success('test')
        expect(testLogger.logCallCount).toBe(before + 1)
      })
    })

    describe('indentation', () => {
      it('should increase indentation with indent()', () => {
        testLogger.indent(4).log('indented')
        expect(stdoutData.join('')).toMatch(/^\s{4}/)
      })

      it('should decrease indentation with dedent()', () => {
        testLogger.indent(4).dedent(2).log('dedented')
        expect(stdoutData.join('')).toMatch(/^\s{2}/)
      })

      it('should reset indentation with resetIndent()', () => {
        testLogger.indent(10).resetIndent().log('reset')
        const output = stdoutData.join('')
        expect(output).toMatch(/^reset/)
      })

      it('should default to 2 spaces for indent', () => {
        testLogger.indent().log('default')
        expect(stdoutData.join('')).toMatch(/^\s{2}/)
      })

      it('should default to 2 spaces for dedent', () => {
        testLogger.indent(4).dedent().log('default')
        expect(stdoutData.join('')).toMatch(/^\s{2}/)
      })

      it('should limit indentation to max value', () => {
        testLogger.indent(2000).log('max')
        expect(stdoutData.join('')).toMatch(/^\s{1000}/)
      })
    })

    describe('group', () => {
      it('should increase indentation', () => {
        testLogger.group()
        testLogger.log('grouped')
        expect(stdoutData.join('')).toMatch(/^\s+grouped/)
      })

      it('should log group label', () => {
        testLogger.group('Group Label')
        expect(stdoutData.join('')).toContain('Group Label')
      })

      it('should support multiple labels', () => {
        testLogger.group('Label1', 'Label2')
        const output = stdoutData.join('')
        expect(output).toContain('Label1')
      })

      it('should return this for chaining', () => {
        const result = testLogger.group()
        expect(result).toBe(testLogger)
      })
    })

    describe('groupCollapsed', () => {
      it('should behave like group', () => {
        testLogger.groupCollapsed('Collapsed')
        testLogger.log('inside')
        const output = stdoutData.join('')
        expect(output).toContain('Collapsed')
        expect(output).toMatch(/\s+inside/)
      })
    })

    describe('groupEnd', () => {
      it('should decrease indentation', () => {
        testLogger.group()
        testLogger.log('inside')
        stdoutData.length = 0
        testLogger.groupEnd()
        testLogger.log('outside')
        expect(stdoutData.join('')).toMatch(/^outside/)
      })

      it('should return this for chaining', () => {
        const result = testLogger.groupEnd()
        expect(result).toBe(testLogger)
      })
    })

    describe('newline', () => {
      it('should log newline with logNewline', () => {
        testLogger.logNewline()
        expect(stdoutData.join('')).toContain('\n')
      })

      it('should not log newline if last was blank', () => {
        testLogger.log('')
        stdoutData.length = 0
        testLogger.logNewline()
        expect(stdoutData.join('')).toBe('')
      })

      it('should log newline to stderr with errorNewline', () => {
        testLogger.errorNewline()
        expect(stderrData.join('')).toContain('\n')
      })

      it('should not log error newline if last was blank', () => {
        testLogger.error('')
        stderrData.length = 0
        testLogger.errorNewline()
        expect(stderrData.join('')).toBe('')
      })
    })

    describe('assert', () => {
      it('should not log when assertion passes', () => {
        testLogger.assert(true, 'should not see this')
        expect(stderrData.join('')).toBe('')
      })

      it('should log when assertion fails', () => {
        testLogger.assert(false, 'assertion failed')
        expect(stderrData.join('')).toContain('Assertion failed')
      })

      it('should not increment count when assertion passes', () => {
        const before = testLogger.logCallCount
        testLogger.assert(true, 'test')
        expect(testLogger.logCallCount).toBe(before)
      })

      it('should increment count when assertion fails', () => {
        const before = testLogger.logCallCount
        testLogger.assert(false, 'test')
        expect(testLogger.logCallCount).toBe(before + 1)
      })
    })

    describe('clear', () => {
      it('should clear console in TTY mode', () => {
        testLogger.log('before clear')
        testLogger.clear()
        expect(testLogger.logCallCount).toBe(0)
      })

      it('should return this for chaining', () => {
        const result = testLogger.clear()
        expect(result).toBe(testLogger)
      })
    })

    describe('count', () => {
      it('should count calls with label', () => {
        testLogger.count('test-label')
        expect(stdoutData.join('')).toContain('test-label')
      })

      it('should count calls without label', () => {
        testLogger.count()
        expect(stdoutData.length).toBeGreaterThan(0)
      })

      it('should increment log call count', () => {
        const before = testLogger.logCallCount
        testLogger.count('test')
        expect(testLogger.logCallCount).toBe(before + 1)
      })
    })

    describe('dir', () => {
      it('should display object properties', () => {
        const obj = { key: 'value', nested: { deep: true } }
        testLogger.dir(obj)
        const output = stdoutData.join('')
        expect(output).toContain('key')
        expect(output).toContain('value')
      })

      it('should accept options', () => {
        const obj = { test: 'value' }
        testLogger.dir(obj, { depth: 1 })
        expect(stdoutData.length).toBeGreaterThan(0)
      })

      it('should increment log call count', () => {
        const before = testLogger.logCallCount
        testLogger.dir({ test: 'value' })
        expect(testLogger.logCallCount).toBe(before + 1)
      })
    })

    describe('dirxml', () => {
      it('should display XML-like data', () => {
        testLogger.dirxml('<div>test</div>')
        expect(stdoutData.length).toBeGreaterThan(0)
      })

      it('should increment log call count', () => {
        const before = testLogger.logCallCount
        testLogger.dirxml('test')
        expect(testLogger.logCallCount).toBe(before + 1)
      })
    })

    describe('table', () => {
      it('should display data in table format', () => {
        const data = [
          { name: 'Alice', age: 30 },
          { name: 'Bob', age: 25 },
        ]
        testLogger.table(data)
        expect(stdoutData.length).toBeGreaterThan(0)
      })

      it('should accept properties parameter', () => {
        const data = [{ a: 1, b: 2, c: 3 }]
        testLogger.table(data, ['a', 'b'])
        expect(stdoutData.length).toBeGreaterThan(0)
      })

      it('should increment log call count', () => {
        const before = testLogger.logCallCount
        testLogger.table([{ x: 1 }])
        expect(testLogger.logCallCount).toBe(before + 1)
      })
    })

    describe('timeEnd', () => {
      it('should end a timer', () => {
        const consoleSpy = vi.spyOn(console, 'time')
        try {
          testLogger.timeEnd('test-timer')
          expect(stdoutData.length).toBeGreaterThanOrEqual(0)
        } finally {
          consoleSpy.mockRestore()
        }
      })

      it('should increment log call count', () => {
        const before = testLogger.logCallCount
        testLogger.timeEnd('test')
        expect(testLogger.logCallCount).toBe(before + 1)
      })
    })

    describe('timeLog', () => {
      it('should log timer value', () => {
        testLogger.timeLog('test-timer')
        expect(stdoutData.length).toBeGreaterThanOrEqual(0)
      })

      it('should accept extra data', () => {
        testLogger.timeLog('timer', 'extra', 'data')
        expect(stdoutData.length).toBeGreaterThanOrEqual(0)
      })

      it('should increment log call count', () => {
        const before = testLogger.logCallCount
        testLogger.timeLog('test')
        expect(testLogger.logCallCount).toBe(before + 1)
      })
    })

    describe('trace', () => {
      it('should log stack trace', () => {
        testLogger.trace('trace message')
        const output = stderrData.join('')
        expect(output).toContain('Trace')
      })

      it('should support multiple arguments', () => {
        testLogger.trace('msg', 'arg1', 'arg2')
        expect(stderrData.length).toBeGreaterThan(0)
      })

      it('should increment log call count', () => {
        const before = testLogger.logCallCount
        testLogger.trace('test')
        expect(testLogger.logCallCount).toBe(before + 1)
      })
    })

    describe('write', () => {
      it('should write to stdout without newline', () => {
        testLogger.write('text')
        expect(stdoutData.join('')).toBe('text')
      })

      it('should not add indentation', () => {
        testLogger.indent(4).write('no-indent')
        expect(stdoutData.join('')).toBe('no-indent')
      })

      it('should return this for chaining', () => {
        const result = testLogger.write('test')
        expect(result).toBe(testLogger)
      })
    })

    describe('createTask', () => {
      it('should create a task that logs start and completion', () => {
        const task = testLogger.createTask('test-task')
        expect(typeof task.run).toBe('function')
      })

      it('should execute function and return result', () => {
        const task = testLogger.createTask('task')
        const result = task.run(() => 42)
        expect(result).toBe(42)
      })

      it('should log start and completion messages', () => {
        const task = testLogger.createTask('my-task')
        task.run(() => 'done')
        const output = stdoutData.join('')
        expect(output).toContain('Starting task: my-task')
        expect(output).toContain('Completed task: my-task')
      })
    })

    describe('symbols', () => {
      it('should track last blank state with symbol', () => {
        testLogger[lastWasBlankSymbol](true)
        testLogger.logNewline()
        expect(stdoutData.join('')).toBe('')
      })

      it('should increment log count with symbol', () => {
        const before = testLogger.logCallCount
        testLogger[incLogCallCountSymbol]()
        expect(testLogger.logCallCount).toBe(before + 1)
      })
    })

    describe('logCallCount', () => {
      it('should start at 0', () => {
        const freshLogger = new Logger({
          stdout: mockStdout,
          stderr: mockStderr,
        })
        expect(freshLogger.logCallCount).toBe(0)
      })

      it('should increment on log', () => {
        const freshLogger = new Logger({
          stdout: mockStdout,
          stderr: mockStderr,
        })
        freshLogger.log('test')
        expect(freshLogger.logCallCount).toBe(1)
      })

      it('should increment on multiple calls', () => {
        const freshLogger = new Logger({
          stdout: mockStdout,
          stderr: mockStderr,
        })
        freshLogger.log('1')
        freshLogger.error('2')
        freshLogger.info('3')
        expect(freshLogger.logCallCount).toBeGreaterThanOrEqual(3)
      })
    })

    describe('static LOG_SYMBOLS', () => {
      it('should expose LOG_SYMBOLS on class', () => {
        expect(Logger.LOG_SYMBOLS).toBe(LOG_SYMBOLS)
      })
    })
  })

  describe('logger instance', () => {
    it('should be a Logger instance', () => {
      expect(logger).toBeInstanceOf(Logger)
    })

    it('should be usable for logging', () => {
      expect(() => logger.log('')).not.toThrow()
    })
  })
})
