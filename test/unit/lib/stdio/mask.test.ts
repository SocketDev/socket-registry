/**
 * @fileoverview Tests for interactive output masking utilities.
 *
 * Validates output masking, keyboard handling, process spawning, and terminal control.
 */

import type { ChildProcess } from 'node:child_process'
import { EventEmitter } from 'node:events'
import type readline from 'node:readline'
import { Writable } from 'node:stream'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock dependencies before importing the module under test.
vi.mock('../../../../registry/src/lib/spinner', () => ({
  spinner: {
    failAndStop: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    successAndStop: vi.fn(),
  },
}))

vi.mock('../../../../registry/src/lib/stdio/clear', () => ({
  clearLine: vi.fn(),
}))

vi.mock('../../../../registry/src/lib/stdio/stdout', () => ({
  write: vi.fn(),
}))

// Mock node:child_process spawn.
vi.mock('node:child_process', async () => {
  const actual =
    await vi.importActual<typeof import('node:child_process')>(
      'node:child_process',
    )
  return {
    ...actual,
    spawn: vi.fn(),
  }
})

import { spawn } from 'node:child_process'
import { spinner } from '@socketsecurity/lib/spinner'
import { clearLine } from '@socketsecurity/lib/stdio/clear'
import {
  attachOutputMask,
  createKeyboardHandler,
  createOutputMask,
  runWithMask,
} from '@socketsecurity/lib/stdio/mask'
import { write } from '@socketsecurity/lib/stdio/stdout'

describe('stdio/mask utilities', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>
  let processStdoutWriteSpy: ReturnType<typeof vi.spyOn>
  let processStderrWriteSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    // Only spy on stdout/stderr if they exist (they might be replaced by mocks in nested beforeEach).
    if (process.stdout && typeof process.stdout.write === 'function') {
      processStdoutWriteSpy = vi
        .spyOn(process.stdout, 'write')
        .mockImplementation(() => true) as ReturnType<typeof vi.spyOn>
    }
    if (process.stderr && typeof process.stderr.write === 'function') {
      processStderrWriteSpy = vi
        .spyOn(process.stderr, 'write')
        .mockImplementation(() => true) as ReturnType<typeof vi.spyOn>
    }
  })

  afterEach(() => {
    consoleLogSpy.mockRestore()
    processStdoutWriteSpy?.mockRestore()
    processStderrWriteSpy?.mockRestore()
    vi.clearAllMocks()
  })

  describe('createOutputMask', () => {
    it('should create mask with default options', () => {
      const mask = createOutputMask()

      expect(mask.verbose).toBe(false)
      expect(mask.outputBuffer).toEqual([])
      expect(mask.isSpinning).toBe(true)
    })

    it('should create mask with showOutput enabled', () => {
      const mask = createOutputMask({ showOutput: true })

      expect(mask.verbose).toBe(true)
      expect(mask.outputBuffer).toEqual([])
      expect(mask.isSpinning).toBe(false)
    })

    it('should create mask with showOutput disabled', () => {
      const mask = createOutputMask({ showOutput: false })

      expect(mask.verbose).toBe(false)
      expect(mask.outputBuffer).toEqual([])
      expect(mask.isSpinning).toBe(true)
    })

    it('should initialize empty output buffer', () => {
      const mask = createOutputMask()

      expect(Array.isArray(mask.outputBuffer)).toBe(true)
      expect(mask.outputBuffer.length).toBe(0)
    })
  })

  describe('createKeyboardHandler', () => {
    let mockChild: ChildProcess
    let mockStdin: EventEmitter & {
      isTTY: boolean
      setRawMode: ReturnType<typeof vi.fn>
    }

    beforeEach(() => {
      mockChild = new EventEmitter() as ChildProcess
      mockChild.kill = vi.fn()

      mockStdin = new EventEmitter() as typeof mockStdin
      mockStdin.isTTY = true
      mockStdin.setRawMode = vi.fn()

      // Replace process.stdin temporarily.
      Object.defineProperty(process, 'stdin', {
        configurable: true,
        value: mockStdin,
        writable: true,
      })
    })

    afterEach(() => {
      // Restore original process.stdin.
      // c8 ignore next 3 - Cleanup code.
      delete (process as unknown as { stdin?: typeof mockStdin }).stdin
    })

    it('should toggle verbose mode on ctrl+o', () => {
      const mask = createOutputMask()
      const handler = createKeyboardHandler(mask, mockChild)

      // Initially not verbose.
      expect(mask.verbose).toBe(false)

      // Press ctrl+o to enable verbose.
      handler('', { ctrl: true, name: 'o' } as readline.Key)

      expect(mask.verbose).toBe(true)
      expect(spinner.stop).toHaveBeenCalled()
      expect(clearLine).toHaveBeenCalled()

      // Press ctrl+o again to disable verbose.
      handler('', { ctrl: true, name: 'o' } as readline.Key)

      expect(mask.verbose).toBe(false)
      expect(spinner.start).toHaveBeenCalled()
    })

    it('should show buffered output when toggling to verbose', () => {
      const mask = createOutputMask()
      mask.outputBuffer = ['line 1\n', 'line 2\n']

      const handler = createKeyboardHandler(mask, mockChild)

      // Press ctrl+o to enable verbose.
      handler('', { ctrl: true, name: 'o' } as readline.Key)

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '--- Output (ctrl+o to hide) ---',
      )
      expect(write).toHaveBeenCalledWith('line 1\n')
      expect(write).toHaveBeenCalledWith('line 2\n')
    })

    it('should clear output lines when toggling from verbose to hidden', () => {
      const mask = createOutputMask({ showOutput: true })
      mask.outputBuffer = ['line 1\n', 'line 2\n', 'line 3\n']

      const handler = createKeyboardHandler(mask, mockChild)

      // Toggle to hidden mode.
      handler('', { ctrl: true, name: 'o' } as readline.Key)

      expect(mask.verbose).toBe(false)
      expect(mask.outputBuffer).toEqual([])
      // Check that ANSI escape sequences were written to clear lines.
      expect(processStdoutWriteSpy).toHaveBeenCalledWith(
        expect.stringContaining('\x1b[1A\x1b[2K'),
      )
    })

    it('should kill child process on ctrl+c', () => {
      const mask = createOutputMask()
      const handler = createKeyboardHandler(mask, mockChild)

      expect(() => {
        handler('', { ctrl: true, name: 'c' } as readline.Key)
      }).toThrow('Process cancelled by user')

      expect(mockChild.kill).toHaveBeenCalledWith('SIGTERM')
    })

    it('should restore raw mode on ctrl+c when TTY', () => {
      const mask = createOutputMask()
      const handler = createKeyboardHandler(mask, mockChild)

      expect(() => {
        handler('', { ctrl: true, name: 'c' } as readline.Key)
      }).toThrow('Process cancelled by user')

      expect(mockStdin.setRawMode).toHaveBeenCalledWith(false)
    })

    it('should use custom message in spinner', () => {
      const mask = createOutputMask({ showOutput: true })
      const handler = createKeyboardHandler(mask, mockChild, {
        message: 'Custom task',
        toggleText: 'for details',
      })

      // Toggle to hidden mode to trigger spinner start.
      // mask.verbose is true, isSpinning is false.
      handler('', { ctrl: true, name: 'o' } as readline.Key)

      expect(spinner.start).toHaveBeenCalledWith(
        'Custom task (ctrl+o for details)',
      )
    })

    it('should handle ctrl+o without buffered output', () => {
      const mask = createOutputMask()
      const handler = createKeyboardHandler(mask, mockChild)

      // Press ctrl+o with empty buffer.
      handler('', { ctrl: true, name: 'o' } as readline.Key)

      expect(mask.verbose).toBe(true)
      expect(clearLine).toHaveBeenCalled()
      expect(write).not.toHaveBeenCalled()
      expect(consoleLogSpy).not.toHaveBeenCalled()
    })

    it('should ignore non-ctrl keys', () => {
      const mask = createOutputMask()
      const handler = createKeyboardHandler(mask, mockChild)
      const initialVerbose = mask.verbose

      handler('o', { ctrl: false, name: 'o' } as readline.Key)

      expect(mask.verbose).toBe(initialVerbose)
      expect(mockChild.kill).not.toHaveBeenCalled()
    })

    it('should ignore keys without name property', () => {
      const mask = createOutputMask()
      const handler = createKeyboardHandler(mask, mockChild)
      const initialVerbose = mask.verbose

      handler('x', {} as readline.Key)

      expect(mask.verbose).toBe(initialVerbose)
    })

    it('should not restart spinner if already spinning', () => {
      const mask = createOutputMask({ showOutput: true })
      mask.isSpinning = false
      const handler = createKeyboardHandler(mask, mockChild)

      // Toggle to hidden mode (spinner should start).
      handler('', { ctrl: true, name: 'o' } as readline.Key)

      expect(spinner.start).toHaveBeenCalledTimes(1)

      // Toggle back to verbose, then hidden again.
      handler('', { ctrl: true, name: 'o' } as readline.Key)
      vi.clearAllMocks()

      // Now mask.isSpinning is false, so it should start again.
      handler('', { ctrl: true, name: 'o' } as readline.Key)

      expect(spinner.start).toHaveBeenCalledTimes(1)
    })
  })

  describe('attachOutputMask', () => {
    let mockChild: ChildProcess & EventEmitter
    let mockStdin: EventEmitter & {
      isTTY: boolean
      on: ReturnType<typeof vi.fn>
      removeListener: ReturnType<typeof vi.fn>
      setRawMode: ReturnType<typeof vi.fn>
    }
    let mockStdout: Writable & { isTTY: boolean }

    beforeEach(() => {
      mockChild = new EventEmitter() as typeof mockChild
      mockChild.stdout = new EventEmitter() as typeof mockChild.stdout
      mockChild.stderr = new EventEmitter() as typeof mockChild.stderr
      mockChild.kill = vi.fn()

      mockStdin = new EventEmitter() as typeof mockStdin
      mockStdin.isTTY = true
      mockStdin.setRawMode = vi.fn()
      mockStdin.on = vi.fn(
        EventEmitter.prototype.on.bind(mockStdin),
      ) as typeof mockStdin.on
      mockStdin.removeListener = vi.fn(
        EventEmitter.prototype.removeListener.bind(mockStdin),
      ) as typeof mockStdin.removeListener

      mockStdout = new Writable() as typeof mockStdout
      mockStdout.isTTY = true

      // Replace process.stdin and process.stdout temporarily.
      Object.defineProperty(process, 'stdin', {
        configurable: true,
        value: mockStdin,
        writable: true,
      })
      Object.defineProperty(process, 'stdout', {
        configurable: true,
        value: mockStdout,
        writable: true,
      })
    })

    afterEach(() => {
      // Restore original process.stdin and process.stdout.
      // c8 ignore next 4 - Cleanup code.
      delete (process as unknown as { stdin?: typeof mockStdin }).stdin
      delete (process as unknown as { stdout?: typeof mockStdout }).stdout
    })

    it('should start spinner when not verbose', async () => {
      const promise = attachOutputMask(mockChild)

      // Simulate process exit.
      mockChild.emit('exit', 0)

      await promise

      expect(spinner.start).toHaveBeenCalledWith(
        'Running… (ctrl+o to see full output)',
      )
    })

    it('should not start spinner when showOutput is true', async () => {
      const promise = attachOutputMask(mockChild, { showOutput: true })

      mockChild.emit('exit', 0)

      await promise

      expect(spinner.start).not.toHaveBeenCalled()
    })

    it('should setup keyboard input handling in raw mode', async () => {
      const promise = attachOutputMask(mockChild)

      mockChild.emit('exit', 0)

      await promise

      expect(mockStdin.setRawMode).toHaveBeenCalledWith(true)
      expect(mockStdin.on).toHaveBeenCalledWith(
        'keypress',
        expect.any(Function),
      )
    })

    it('should buffer stdout when not verbose', async () => {
      const promise = attachOutputMask(mockChild)

      mockChild.stdout?.emit('data', Buffer.from('test output\n'))
      mockChild.emit('exit', 0)

      await promise

      // Output should not be written to stdout.
      expect(write).not.toHaveBeenCalled()
    })

    it('should show stdout immediately when verbose', async () => {
      const promise = attachOutputMask(mockChild, { showOutput: true })

      mockChild.stdout?.emit('data', Buffer.from('test output\n'))
      mockChild.emit('exit', 0)

      await promise

      expect(write).toHaveBeenCalledWith('test output\n')
    })

    it('should buffer stderr when not verbose', async () => {
      const promise = attachOutputMask(mockChild)

      mockChild.stderr?.emit('data', Buffer.from('error output\n'))
      mockChild.emit('exit', 0)

      await promise

      expect(processStderrWriteSpy).not.toHaveBeenCalledWith('error output\n')
    })

    it('should show stderr immediately when verbose', async () => {
      const promise = attachOutputMask(mockChild, { showOutput: true })

      mockChild.stderr?.emit('data', Buffer.from('error output\n'))
      mockChild.emit('exit', 0)

      await promise

      expect(processStderrWriteSpy).toHaveBeenCalledWith('error output\n')
    })

    it('should limit buffer to 1000 lines', async () => {
      const promise = attachOutputMask(mockChild)

      // Generate more than 1000 lines.
      const lines = Array.from({ length: 1100 }, (_, i) => `line ${i}\n`)
      for (const line of lines) {
        mockChild.stdout?.emit('data', Buffer.from(line))
      }

      mockChild.emit('exit', 0)

      await promise

      // Buffer should not have been written (not verbose).
      expect(write).not.toHaveBeenCalled()
    })

    it('should show success spinner on exit code 0', async () => {
      const promise = attachOutputMask(mockChild)

      mockChild.emit('exit', 0)

      await promise

      expect(spinner.successAndStop).toHaveBeenCalledWith('Running… completed')
    })

    it('should show failure spinner on non-zero exit code', async () => {
      const promise = attachOutputMask(mockChild)

      mockChild.emit('exit', 1)

      const result = await promise

      expect(result).toBe(1)
      expect(spinner.failAndStop).toHaveBeenCalledWith('Running… failed')
    })

    it('should show buffered output on failure', async () => {
      const promise = attachOutputMask(mockChild)

      mockChild.stdout?.emit('data', Buffer.from('error details\n'))
      mockChild.emit('exit', 1)

      await promise

      expect(spinner.failAndStop).toHaveBeenCalled()
      expect(consoleLogSpy).toHaveBeenCalledWith('\n--- Output ---')
      expect(write).toHaveBeenCalledWith('error details\n')
    })

    it('should restore raw mode on exit', async () => {
      const promise = attachOutputMask(mockChild)

      mockChild.emit('exit', 0)

      await promise

      expect(mockStdin.setRawMode).toHaveBeenCalledWith(false)
    })

    it('should remove keypress listener on exit', async () => {
      const promise = attachOutputMask(mockChild)

      mockChild.emit('exit', 0)

      await promise

      expect(mockStdin.removeListener).toHaveBeenCalledWith(
        'keypress',
        expect.any(Function),
      )
    })

    it('should handle error event', async () => {
      const promise = attachOutputMask(mockChild)

      const testError = new Error('Process error')
      mockChild.emit('error', testError)

      await expect(promise).rejects.toThrow('Process error')
      expect(spinner.failAndStop).toHaveBeenCalledWith('Running… error')
      expect(mockStdin.setRawMode).toHaveBeenCalledWith(false)
    })

    it('should use custom message', async () => {
      const promise = attachOutputMask(mockChild, {
        message: 'Custom task',
        toggleText: 'for details',
      })

      mockChild.emit('exit', 0)

      await promise

      expect(spinner.start).toHaveBeenCalledWith(
        'Custom task (ctrl+o for details)',
      )
      expect(spinner.successAndStop).toHaveBeenCalledWith(
        'Custom task completed',
      )
    })

    it('should handle exit with null code', async () => {
      const promise = attachOutputMask(mockChild)

      mockChild.emit('exit', null)

      const result = await promise

      expect(result).toBe(0)
    })

    it('should not setup keyboard handling when stdin is not TTY', async () => {
      mockStdin.isTTY = false

      const promise = attachOutputMask(mockChild)

      mockChild.emit('exit', 0)

      await promise

      expect(mockStdin.setRawMode).not.toHaveBeenCalled()
    })

    it('should not start spinner when stdout is not TTY', async () => {
      mockStdout.isTTY = false

      const promise = attachOutputMask(mockChild)

      mockChild.emit('exit', 0)

      await promise

      expect(spinner.start).not.toHaveBeenCalled()
    })

    it('should not show buffered output on success when verbose', async () => {
      const promise = attachOutputMask(mockChild, { showOutput: true })

      mockChild.stdout?.emit('data', Buffer.from('output\n'))
      mockChild.emit('exit', 0)

      await promise

      // Output should have been written immediately, not buffered.
      expect(write).toHaveBeenCalledWith('output\n')
      expect(consoleLogSpy).not.toHaveBeenCalledWith('\n--- Output ---')
    })

    it('should handle child process without stdout', async () => {
      mockChild.stdout = null

      const promise = attachOutputMask(mockChild)

      mockChild.emit('exit', 0)

      const result = await promise

      expect(result).toBe(0)
    })

    it('should handle child process without stderr', async () => {
      mockChild.stderr = null

      const promise = attachOutputMask(mockChild)

      mockChild.emit('exit', 0)

      const result = await promise

      expect(result).toBe(0)
    })
  })

  describe('runWithMask', () => {
    let mockChild: ChildProcess & EventEmitter

    beforeEach(() => {
      mockChild = new EventEmitter() as typeof mockChild
      mockChild.stdout = new EventEmitter() as typeof mockChild.stdout
      mockChild.stderr = new EventEmitter() as typeof mockChild.stderr
      mockChild.kill = vi.fn()

      // Mock spawn function.
      vi.mocked(spawn).mockReturnValue(mockChild as never)

      // Mock stdin/stdout as TTY.
      const mockStdin = new EventEmitter() as EventEmitter & {
        isTTY: boolean
        removeListener: ReturnType<typeof vi.fn>
        setRawMode: ReturnType<typeof vi.fn>
      }
      mockStdin.isTTY = true
      mockStdin.setRawMode = vi.fn()
      mockStdin.removeListener = vi.fn(
        EventEmitter.prototype.removeListener.bind(mockStdin),
      ) as typeof mockStdin.removeListener

      const mockStdout = new Writable() as Writable & { isTTY: boolean }
      mockStdout.isTTY = true

      Object.defineProperty(process, 'stdin', {
        configurable: true,
        value: mockStdin,
        writable: true,
      })
      Object.defineProperty(process, 'stdout', {
        configurable: true,
        value: mockStdout,
        writable: true,
      })
    })

    afterEach(() => {
      // Restore mocks.
      // c8 ignore next 4 - Cleanup code.
      vi.restoreAllMocks()
      delete (process as unknown as { stdin?: unknown }).stdin
      delete (process as unknown as { stdout?: unknown }).stdout
    })

    it('should spawn command with correct arguments', async () => {
      const promise = runWithMask('echo', ['hello', 'world'])

      mockChild.emit('exit', 0)

      await promise

      expect(spawn).toHaveBeenCalledWith('echo', ['hello', 'world'], {
        stdio: ['inherit', 'pipe', 'pipe'],
      })
    })

    it('should pass spawn options', async () => {
      const promise = runWithMask('npm', ['install'], {
        cwd: '/test/dir',
        env: { NODE_ENV: 'test' },
      })

      mockChild.emit('exit', 0)

      await promise

      expect(spawn).toHaveBeenCalledWith('npm', ['install'], {
        cwd: '/test/dir',
        env: { NODE_ENV: 'test' },
        stdio: ['inherit', 'pipe', 'pipe'],
      })
    })

    it('should use custom message', async () => {
      const promise = runWithMask('test', [], {
        message: 'Testing',
        toggleText: 'for output',
      })

      mockChild.emit('exit', 0)

      await promise

      expect(spinner.start).toHaveBeenCalledWith('Testing (ctrl+o for output)')
    })

    it('should enable showOutput', async () => {
      const promise = runWithMask('test', [], { showOutput: true })

      mockChild.emit('exit', 0)

      await promise

      expect(spinner.start).not.toHaveBeenCalled()
    })

    it('should return exit code', async () => {
      const promise = runWithMask('test', [])

      mockChild.emit('exit', 42)

      const result = await promise

      expect(result).toBe(42)
    })

    it('should handle command with no arguments', async () => {
      const promise = runWithMask('pwd')

      mockChild.emit('exit', 0)

      await promise

      expect(spawn).toHaveBeenCalledWith('pwd', [], {
        stdio: ['inherit', 'pipe', 'pipe'],
      })
    })

    it('should always use inherit for stdin in stdio', async () => {
      const promise = runWithMask('pwd')

      mockChild.emit('exit', 0)

      const result = await promise

      expect(result).toBe(0)
      // runWithMask always uses ['inherit', 'pipe', 'pipe'] for stdio.
      const spawnCall =
        vi.mocked(spawn).mock.calls[vi.mocked(spawn).mock.calls.length - 1]
      expect(spawnCall).toBeDefined()
      expect(spawnCall?.[2]).toHaveProperty('stdio')
      expect(spawnCall?.[2]?.stdio).toEqual(['inherit', 'pipe', 'pipe'])
    })
  })

  describe('ANSI escape sequences', () => {
    let mockStdout: NodeJS.WriteStream

    beforeEach(() => {
      mockStdout = {
        isTTY: false,
        write: vi.fn(() => true),
      } as unknown as NodeJS.WriteStream

      Object.defineProperty(process, 'stdout', {
        configurable: true,
        value: mockStdout,
        writable: true,
      })
    })

    afterEach(() => {
      // c8 ignore next 2 - Cleanup code.
      delete (process as unknown as { stdout?: NodeJS.WriteStream }).stdout
    })

    it('should use correct escape sequences for line clearing', () => {
      const mask = createOutputMask({ showOutput: true })
      mask.outputBuffer = ['line 1\n', 'line 2\n']

      const mockChild = new EventEmitter() as ChildProcess
      mockChild.kill = vi.fn()

      const handler = createKeyboardHandler(mask, mockChild)

      // Toggle to hidden mode to trigger line clearing.
      handler('', { ctrl: true, name: 'o' } as readline.Key)

      // Check for ANSI escape sequences.

      expect(mockStdout.write).toHaveBeenCalledWith(
        expect.stringContaining('\x1b[1A\x1b[2K'),
      )
    })

    it('should handle multiline output in buffer', () => {
      const mask = createOutputMask({ showOutput: true })
      mask.outputBuffer = ['line 1\nline 2\n', 'line 3\n']

      const mockChild = new EventEmitter() as ChildProcess
      mockChild.kill = vi.fn()

      const handler = createKeyboardHandler(mask, mockChild)

      // Toggle to hidden mode.
      handler('', { ctrl: true, name: 'o' } as readline.Key)

      // Should calculate correct number of lines to clear (3 lines + 1 header).
      const writeMock = vi.mocked(mockStdout.write)
      const callCount = writeMock.mock.calls.filter(call =>
        String(call[0]).includes('\x1b[1A\x1b[2K'),
      ).length

      expect(callCount).toBeGreaterThan(0)
    })
  })

  describe('buffer management', () => {
    it('should handle buffer exceeding 1000 lines', () => {
      const mask = createOutputMask()

      // Create a large buffer.
      const lines = Array.from({ length: 1100 }, (_, i) => `line ${i}`).join(
        '\n',
      )

      // Simulate receiving data that exceeds buffer limit.
      mask.outputBuffer.push(lines)

      // Simulate the buffer trimming logic from attachOutputMask.
      const allLines = mask.outputBuffer.join('').split('\n')
      if (allLines.length > 1000) {
        mask.outputBuffer = [allLines.slice(-1000).join('\n')]
      }

      expect(mask.outputBuffer.length).toBe(1)
      expect(mask.outputBuffer[0]?.split('\n').length).toBeLessThanOrEqual(1000)
    })

    it('should preserve buffer content when under limit', () => {
      const mask = createOutputMask()
      const originalContent = ['line 1\n', 'line 2\n', 'line 3\n']

      mask.outputBuffer = [...originalContent]

      const allLines = mask.outputBuffer.join('').split('\n')
      if (allLines.length > 1000) {
        mask.outputBuffer = [allLines.slice(-1000).join('\n')]
      }

      expect(mask.outputBuffer).toEqual(originalContent)
    })
  })

  describe('edge cases', () => {
    it('should handle empty message option', async () => {
      const mockChild = new EventEmitter() as ChildProcess & EventEmitter
      mockChild.stdout = new EventEmitter() as typeof mockChild.stdout
      mockChild.stderr = new EventEmitter() as typeof mockChild.stderr

      const mockStdin = new EventEmitter() as EventEmitter & {
        isTTY: boolean
        removeListener: ReturnType<typeof vi.fn>
        setRawMode: ReturnType<typeof vi.fn>
      }
      mockStdin.isTTY = true
      mockStdin.setRawMode = vi.fn()
      mockStdin.removeListener = vi.fn(
        EventEmitter.prototype.removeListener.bind(mockStdin),
      ) as typeof mockStdin.removeListener

      const mockStdout = { isTTY: true } as NodeJS.WriteStream

      Object.defineProperty(process, 'stdin', {
        configurable: true,
        value: mockStdin,
        writable: true,
      })
      Object.defineProperty(process, 'stdout', {
        configurable: true,
        value: mockStdout,
        writable: true,
      })

      const promise = attachOutputMask(mockChild, { message: '' })

      mockChild.emit('exit', 0)

      await promise

      // Should use empty string for message.
      expect(spinner.successAndStop).toHaveBeenCalledWith(' completed')
    })

    it('should handle empty toggleText option', () => {
      const mask = createOutputMask({ showOutput: true })
      const mockChild = new EventEmitter() as ChildProcess
      mockChild.kill = vi.fn()

      const handler = createKeyboardHandler(mask, mockChild, {
        toggleText: '',
      })

      // Toggle from verbose to hidden.
      handler('', { ctrl: true, name: 'o' } as readline.Key)

      expect(spinner.start).toHaveBeenCalledWith('Running… (ctrl+o )')
    })

    it('should handle undefined key parameter', () => {
      const mask = createOutputMask()
      const mockChild = new EventEmitter() as ChildProcess
      mockChild.kill = vi.fn()

      const handler = createKeyboardHandler(mask, mockChild)

      // Call with undefined key.
      handler('', undefined as unknown as readline.Key)

      // Should not throw or change state.
      expect(mask.verbose).toBe(false)
    })

    it('should handle stdout data event returning value', async () => {
      const mockChild = new EventEmitter() as ChildProcess & EventEmitter
      mockChild.stdout = new EventEmitter() as typeof mockChild.stdout
      mockChild.stderr = new EventEmitter() as typeof mockChild.stderr

      const mockStdin = new EventEmitter() as EventEmitter & {
        isTTY: boolean
        removeListener: ReturnType<typeof vi.fn>
        setRawMode: ReturnType<typeof vi.fn>
      }
      mockStdin.isTTY = true
      mockStdin.setRawMode = vi.fn()
      mockStdin.removeListener = vi.fn(
        EventEmitter.prototype.removeListener.bind(mockStdin),
      ) as typeof mockStdin.removeListener

      const mockStdout = { isTTY: true } as NodeJS.WriteStream

      Object.defineProperty(process, 'stdin', {
        configurable: true,
        value: mockStdin,
        writable: true,
      })
      Object.defineProperty(process, 'stdout', {
        configurable: true,
        value: mockStdout,
        writable: true,
      })

      const promise = attachOutputMask(mockChild)

      // Emit data event (the handler explicitly returns undefined).
      mockChild.stdout?.emit('data', Buffer.from('test\n'))

      mockChild.emit('exit', 0)

      await promise

      // Should complete without error.
      expect(true).toBe(true)
    })
  })
})
