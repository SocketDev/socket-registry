/**
 * @fileoverview Interactive output masking utilities for CLI tools.
 * Provides output control with keyboard toggling (ctrl+o).
 *
 * ANSI Escape Sequences Used:
 * - '\r': Carriage return - moves cursor to beginning of current line.
 * - '\x1b[K' or '\x1b[0K': CSI K (erase line) - clear from cursor to end of line.
 * - '\x1b[2K': CSI 2K - erase entire line.
 * - '\x1b[1A': CSI A - move cursor up 1 line.
 *
 * Terminal Control:
 * - Raw mode (setRawMode(true)): Captures keypresses immediately without buffering.
 * - TTY detection: Ensures terminal manipulation only occurs in interactive terminals.
 *
 * Key Features:
 * - Output buffering: Stores up to 1000 lines when masked to prevent memory issues.
 * - Graceful cleanup: Always restores terminal to normal mode on exit/error.
 * - Visual feedback: Uses spinner to indicate process is running when output is masked.
 */

import type { ChildProcess, SpawnOptions } from 'node:child_process'
import { spawn } from 'node:child_process'
import readline from 'node:readline'
import { spinner } from '../spinner.js'
import { clearLine } from './clear.js'
import { write } from './stdout.js'

export interface OutputMaskOptions {
  /** Current working directory */
  cwd?: string
  /** Environment variables */
  env?: NodeJS.ProcessEnv
  /** Progress message to display */
  message?: string
  /** Show output by default instead of masking it */
  showOutput?: boolean
  /** Text to show after "ctrl+o" in spinner */
  toggleText?: string
}

export interface OutputMask {
  /** Whether output is currently visible */
  verbose: boolean
  /** Buffered output lines */
  outputBuffer: string[]
  /** Whether spinner is currently active */
  isSpinning: boolean
}

/**
 * Create an output mask for controlling command output visibility.
 * The mask tracks whether output should be shown or hidden (buffered).
 * When hidden, output is buffered and a spinner is shown instead.
 */
export function createOutputMask(options: OutputMaskOptions = {}): OutputMask {
  const { showOutput = false } = options

  return {
    verbose: showOutput,
    outputBuffer: [],
    isSpinning: !showOutput,
  }
}

/**
 * Create a keyboard handler for toggling output visibility.
 * Handles two key combinations:
 * - ctrl+o: Toggle between showing and hiding output.
 * - ctrl+c: Cancel the running process.
 * The handler manipulates terminal state using ANSI escape sequences.
 */
export function createKeyboardHandler(
  mask: OutputMask,
  child: ChildProcess,
  options: OutputMaskOptions = {},
): (_str: string, key: readline.Key) => void {
  const { message = 'Running…', toggleText = 'to see full output' } = options

  return (_str, key) => {
    // ctrl+o toggles verbose mode.
    if (key?.ctrl && key.name === 'o') {
      mask.verbose = !mask.verbose

      if (mask.verbose) {
        // Stop spinner and show buffered output.
        if (mask.isSpinning) {
          spinner.stop()
          mask.isSpinning = false
        }

        // Clear the current line (removes spinner remnants).
        clearLine()

        // Show buffered output.
        if (mask.outputBuffer.length > 0) {
          console.log('--- Output (ctrl+o to hide) ---')
          mask.outputBuffer.forEach(line => {
            write(line)
          })
        }
      } else {
        // Hide output and show spinner.
        // Clear all the output lines that were shown.
        if (mask.outputBuffer.length > 0) {
          // Calculate number of lines to clear (output + header line).
          const lineCount = mask.outputBuffer.join('').split('\n').length + 1
          // Move up and clear each line using ANSI escape sequences:
          // - '\x1b[1A' (CSI A): Move cursor up 1 line.
          // - '\x1b[2K' (CSI K with param 2): Erase entire line.
          // This combination effectively "rewinds" the terminal output.
          for (let i = 0; i < lineCount; i += 1) {
            process.stdout.write('\x1b[1A\x1b[2K')
          }
        }
        clearLine()

        // Clear the buffer and restart spinner.
        mask.outputBuffer = []
        if (!mask.isSpinning) {
          spinner.start(`${message} (ctrl+o ${toggleText})`)
          mask.isSpinning = true
        }
      }
    }
    // ctrl+c to cancel.
    else if (key?.ctrl && key.name === 'c') {
      // Gracefully terminate child process.
      child.kill('SIGTERM')
      // Restore terminal to normal mode before exiting.
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(false)
      }
      throw new Error('Process cancelled by user')
    }
  }
}

/**
 * Attach output masking to a child process.
 * Returns a promise that resolves with the exit code.
 * This function:
 * - Sets up keyboard input handling in raw mode for immediate key capture.
 * - Buffers stdout/stderr when not in verbose mode.
 * - Shows a spinner when output is masked.
 * - Allows toggling between masked and unmasked output with ctrl+o.
 */
export function attachOutputMask(
  child: ChildProcess,
  options: OutputMaskOptions = {},
): Promise<number> {
  return new Promise((resolve, reject) => {
    const { message = 'Running…' } = options
    const mask = createOutputMask(options)

    // Start spinner if not verbose.
    if (mask.isSpinning && process.stdout.isTTY) {
      spinner.start(
        `${message} (ctrl+o ${options.toggleText || 'to see full output'})`,
      )
    }

    // Setup keyboard input handling.
    // Raw mode is required to capture ctrl+o without waiting for Enter.
    if (process.stdin.isTTY) {
      readline.emitKeypressEvents(process.stdin)
      process.stdin.setRawMode(true)

      const keypressHandler = createKeyboardHandler(mask, child, options)
      process.stdin.on('keypress', keypressHandler)

      // Cleanup on exit: restore terminal to normal mode.
      child.on('exit', () => {
        if (process.stdin.isTTY) {
          process.stdin.setRawMode(false)
          process.stdin.removeListener('keypress', keypressHandler)
        }
      })
    }

    // Handle stdout: either show immediately or buffer for later.
    if (child.stdout) {
      child.stdout.on('data', data => {
        const text = data.toString()
        if (mask.verbose) {
          write(text)
        } else {
          // Buffer the output for later.
          mask.outputBuffer.push(text)

          // Keep buffer size reasonable (last 1000 lines).
          // This prevents unbounded memory growth for long-running processes.
          const lines = mask.outputBuffer.join('').split('\n')
          if (lines.length > 1000) {
            mask.outputBuffer = [lines.slice(-1000).join('\n')]
          }
        }
        return undefined
      })
    }

    // Handle stderr: same as stdout, but write to stderr stream when verbose.
    if (child.stderr) {
      child.stderr.on('data', data => {
        const text = data.toString()
        if (mask.verbose) {
          process.stderr.write(text)
        } else {
          mask.outputBuffer.push(text)
        }
        return undefined
      })
    }

    child.on('exit', code => {
      // Cleanup keyboard if needed.
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(false)
      }

      if (mask.isSpinning) {
        if (code === 0) {
          spinner.successAndStop(`${message} completed`)
        } else {
          spinner.failAndStop(`${message} failed`)
          // Show buffered output on failure so user can see what went wrong.
          if (mask.outputBuffer.length > 0 && !mask.verbose) {
            console.log('\n--- Output ---')
            mask.outputBuffer.forEach(line => {
              write(line)
            })
          }
        }
      }

      resolve(code || 0)
    })

    child.on('error', error => {
      // Ensure terminal is restored to normal mode on error.
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(false)
      }

      if (mask.isSpinning) {
        spinner.failAndStop(`${message} error`)
      }
      reject(error)
    })
  })
}

/**
 * Run a command with interactive output masking.
 * Convenience wrapper around spawn + attachOutputMask.
 * Spawns a child process and attaches the output masking system to it.
 * stdin is inherited, stdout and stderr are piped for masking control.
 */
export async function runWithMask(
  command: string,
  args: string[] = [],
  options: OutputMaskOptions & SpawnOptions = {},
): Promise<number> {
  const {
    message = 'Running…',
    showOutput = false,
    toggleText = 'to see output',
    ...spawnOptions
  } = options

  const child = spawn(command, args, {
    stdio: ['inherit', 'pipe', 'pipe'],
    ...spawnOptions,
  })

  return await attachOutputMask(child, { message, showOutput, toggleText })
}
