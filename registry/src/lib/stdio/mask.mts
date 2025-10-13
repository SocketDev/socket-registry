/**
 * @fileoverview Interactive output masking utilities for CLI tools.
 * Provides output control with keyboard toggling (Ctrl+O).
 */

import { spawn } from 'node:child_process'
import readline from 'node:readline'

import { spinner } from '../spinner.js'

import type { ChildProcess, SpawnOptions } from 'node:child_process'

export interface OutputMaskOptions {
  /** Current working directory */
  cwd?: string
  /** Environment variables */
  env?: NodeJS.ProcessEnv
  /** Progress message to display */
  message?: string
  /** Show output by default instead of masking it */
  showOutput?: boolean
  /** Text to show after "Ctrl+O" in spinner */
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
 * Clear the current terminal line.
 */
export function clearLine(): void {
  process.stdout.write('\r\x1b[K')
}

/**
 * Write output to stdout.
 */
export function writeOutput(text: string): void {
  process.stdout.write(text)
}

/**
 * Create an output mask for controlling command output visibility.
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
 */
export function createKeyboardHandler(
  mask: OutputMask,
  child: ChildProcess,
  options: OutputMaskOptions = {}
): (_str: string, key: readline.Key) => void {
  const { message = 'Running...', toggleText = 'to see full output' } = options

  return (_str, key) => {
    // Ctrl+O toggles verbose mode
    if (key && key.ctrl && key.name === 'o') {
      mask.verbose = !mask.verbose

      if (mask.verbose) {
        // Stop spinner and show buffered output
        if (mask.isSpinning) {
          spinner.stop()
          mask.isSpinning = false
        }

        // Clear the current line
        clearLine()

        // Show buffered output
        if (mask.outputBuffer.length > 0) {
          console.log('--- Output ---')
          mask.outputBuffer.forEach(line => writeOutput(line))
          mask.outputBuffer = []
        }
      } else {
        // Hide output and show spinner
        clearLine()
        if (!mask.isSpinning) {
          spinner.start(`${message} (Ctrl+O ${toggleText})`)
          mask.isSpinning = true
        }
      }
    }
    // Ctrl+C to cancel
    else if (key && key.ctrl && key.name === 'c') {
      child.kill('SIGTERM')
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
 */
export function attachOutputMask(
  child: ChildProcess,
  options: OutputMaskOptions = {}
): Promise<number> {
  return new Promise((resolve, reject) => {
    const { message = 'Running...' } = options
    const mask = createOutputMask(options)

    // Start spinner if not verbose
    if (mask.isSpinning && process.stdout.isTTY) {
      spinner.start(`${message} (Ctrl+O ${options.toggleText || 'to see full output'})`)
    }

    // Setup keyboard input handling
    if (process.stdin.isTTY) {
      readline.emitKeypressEvents(process.stdin)
      process.stdin.setRawMode(true)

      const keypressHandler = createKeyboardHandler(mask, child, options)
      process.stdin.on('keypress', keypressHandler)

      // Cleanup on exit
      child.on('exit', () => {
        if (process.stdin.isTTY) {
          process.stdin.setRawMode(false)
          process.stdin.removeListener('keypress', keypressHandler)
        }
      })
    }

    // Handle stdout
    if (child.stdout) {
      child.stdout.on('data', data => {
        const text = data.toString()
        if (mask.verbose) {
          writeOutput(text)
        } else {
          // Buffer the output for later
          mask.outputBuffer.push(text)

          // Keep buffer size reasonable (last 1000 lines)
          const lines = mask.outputBuffer.join('').split('\n')
          if (lines.length > 1000) {
            mask.outputBuffer = [lines.slice(-1000).join('\n')]
          }
        }
      })
    }

    // Handle stderr
    if (child.stderr) {
      child.stderr.on('data', data => {
        const text = data.toString()
        if (mask.verbose) {
          process.stderr.write(text)
        } else {
          mask.outputBuffer.push(text)
        }
      })
    }

    child.on('exit', code => {
      // Cleanup keyboard if needed
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(false)
      }

      if (mask.isSpinning) {
        if (code === 0) {
          spinner.success(`${message} completed`)
        } else {
          spinner.fail(`${message} failed`)
          // Show buffered output on failure
          if (mask.outputBuffer.length > 0 && !mask.verbose) {
            console.log('\n--- Output ---')
            mask.outputBuffer.forEach(line => writeOutput(line))
          }
        }
      }

      resolve(code || 0)
    })

    child.on('error', error => {
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(false)
      }

      if (mask.isSpinning) {
        spinner.fail(`${message} error`)
      }
      reject(error)
    })
  })
}

/**
 * Run a command with interactive output masking.
 * Convenience wrapper around spawn + attachOutputMask.
 */
export async function runWithMask(
  command: string,
  args: string[] = [],
  options: OutputMaskOptions & SpawnOptions = {}
): Promise<number> {
  const { message = 'Running...', showOutput = false, toggleText = 'to see output', ...spawnOptions } = options

  const child = spawn(command, args, {
    stdio: ['inherit', 'pipe', 'pipe'],
    ...spawnOptions,
  })

  return await attachOutputMask(child, { message, showOutput, toggleText })
}
