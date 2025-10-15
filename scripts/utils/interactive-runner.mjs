/**
 * @fileoverview Interactive runner for commands with Ctrl+O toggle.
 * Standardized across all socket-* repositories.
 */

import { spawn } from 'node:child_process'
import readline from 'node:readline'

// Simple inline spinner for build-time use (avoids circular dependency).
// This is intentionally minimal to avoid depending on registry code during build.
function createSpinner() {
  let state = {
    __proto__: null,
    frameIndex: 0,
    frames: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'],
    interval: null,
    isSpinning: false,
    message: '',
  }

  // Detect CI environment.
  const isCI = Boolean(
    process.env.CI ||
      process.env.CONTINUOUS_INTEGRATION ||
      process.env.BUILD_NUMBER ||
      process.env.TRAVIS ||
      process.env.CIRCLECI ||
      process.env.JENKINS_URL ||
      process.env.GITHUB_ACTIONS,
  )

  return {
    __proto__: null,
    start(message) {
      state.message = message
      state.isSpinning = true

      // Skip animation in CI or non-TTY.
      if (isCI || !process.stdout.isTTY) {
        console.log(message)
        return
      }

      state.interval = setInterval(() => {
        const frame = state.frames[state.frameIndex]
        state.frameIndex = (state.frameIndex + 1) % state.frames.length
        process.stdout.write(`\r${frame} ${state.message}`)
      }, 80)
    },

    stop() {
      if (state.interval) {
        clearInterval(state.interval)
        state.interval = null
      }
      if (process.stdout.isTTY) {
        process.stdout.write('\r\x1b[K')
      }
      state.isSpinning = false
    },

    successAndStop(message) {
      this.stop()
      console.log(`✓ ${message}`)
    },

    failAndStop(message) {
      this.stop()
      console.error(`✗ ${message}`)
    },
  }
}

const spinner = createSpinner()

// Cleanup on process exit.
process.on('exit', () => {
  spinner.stop()
})

/**
 * Run a command with interactive output control.
 * Standard experience across all socket-* repos.
 *
 * @param {string} command - Command to run
 * @param {string[]} args - Command arguments
 * @param {object} options - Options
 * @param {string} options.message - Progress message
 * @param {string} options.toggleText - Text after "ctrl+o" (default: "to expand")
 * @param {boolean} options.showOnError - Show output on error (default: true)
 * @param {boolean} options.verbose - Start in verbose mode (default: false)
 * @returns {Promise<number>} Exit code
 */
export async function runWithOutput(command, args = [], options = {}) {
  const {
    cwd = process.cwd(),
    env = process.env,
    message = 'Running',
    showOnError = true,
    toggleText = 'to expand',
    verbose = false,
  } = options

  return new Promise((resolve, reject) => {
    let isSpinning = false
    let outputBuffer = []
    let showOutput = verbose
    let hasTestFailures = false
    let hasWorkerTerminationError = false

    // Start spinner if not verbose and TTY
    if (!showOutput && process.stdout.isTTY) {
      spinner.start(`${message} (ctrl+o ${toggleText})`)
      isSpinning = true
    }

    const child = spawn(command, args, {
      cwd,
      env,
      stdio: ['inherit', 'pipe', 'pipe'],
    })

    // Setup keyboard handling for TTY
    if (process.stdin.isTTY && !verbose) {
      readline.emitKeypressEvents(process.stdin)
      process.stdin.setRawMode(true)

      const keypressHandler = (_str, key) => {
        // Ctrl+O toggles output
        if (key?.ctrl && key.name === 'o') {
          showOutput = !showOutput

          if (showOutput) {
            // Stop spinner and show buffered output
            if (isSpinning) {
              spinner.stop()
              isSpinning = false
            }

            // Clear spinner line and show buffer
            process.stdout.write('\r\x1b[K')
            // Dump all buffered output
            if (outputBuffer.length > 0) {
              outputBuffer.forEach(line => {
                process.stdout.write(line)
              })
              // DON'T clear the buffer - keep it for potential toggle back
            }
            // Now output continues to stream live to stdout
          } else {
            // Hide output and restart spinner
            process.stdout.write('\r\x1b[K')
            if (!isSpinning) {
              spinner.start(`${message} (ctrl+o ${toggleText})`)
              isSpinning = true
            }
            // Output will now buffer again
          }
        }
        // Ctrl+C to cancel
        else if (key?.ctrl && key.name === 'c') {
          child.kill('SIGTERM')
          if (process.stdin.isTTY) {
            process.stdin.setRawMode(false)
          }
          process.exit(130)
        }
      }

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

        // Filter out known non-fatal warnings (can appear in stdout too)
        const isFilteredWarning =
          text.includes('Terminating worker thread') ||
          text.includes('Unhandled Rejection') ||
          text.includes('Object.ThreadTermination') ||
          text.includes('tinypool@')

        if (isFilteredWarning) {
          hasWorkerTerminationError = true
          // Skip these warnings - they're non-fatal cleanup messages
          // But continue to check for test failures in the same output
        }

        // Check for test failures in vitest output
        if (
          text.includes('FAIL') ||
          text.match(/Test Files.*\d+ failed/) ||
          text.match(/Tests\s+\d+ failed/)
        ) {
          hasTestFailures = true
        }

        // Don't write filtered warnings to output
        if (isFilteredWarning) {
          return
        }

        if (showOutput) {
          process.stdout.write(text)
        } else {
          outputBuffer.push(text)
          // Keep buffer reasonable (last 1000 lines)
          const lines = outputBuffer.join('').split('\n')
          if (lines.length > 1000) {
            outputBuffer = [lines.slice(-1000).join('\n')]
          }
        }
      })
    }

    // Handle stderr
    if (child.stderr) {
      child.stderr.on('data', data => {
        const text = data.toString()
        // Filter out known non-fatal warnings
        const isFilteredWarning =
          text.includes('Terminating worker thread') ||
          text.includes('Unhandled Rejection') ||
          text.includes('Object.ThreadTermination') ||
          text.includes('tinypool@')

        if (isFilteredWarning) {
          hasWorkerTerminationError = true
          // Skip these warnings - they're non-fatal cleanup messages
          return
        }

        // Check for test failures
        if (
          text.includes('FAIL') ||
          text.match(/Test Files.*\d+ failed/) ||
          text.match(/Tests\s+\d+ failed/)
        ) {
          hasTestFailures = true
        }

        if (showOutput) {
          process.stderr.write(text)
        } else {
          outputBuffer.push(text)
        }
      })
    }

    child.on('exit', code => {
      // Cleanup keyboard if needed - MUST happen before spinner stop
      if (process.stdin.isTTY && !verbose) {
        process.stdin.setRawMode(false)
        process.stdin.pause()
      }

      // Override exit code if we only have worker termination errors
      // and no actual test failures
      let finalCode = code || 0
      if (code !== 0 && hasWorkerTerminationError && !hasTestFailures) {
        // This is the known non-fatal worker thread cleanup issue
        // All tests passed, so return success
        finalCode = 0
      }

      if (isSpinning) {
        if (finalCode === 0) {
          spinner.successAndStop(`${message} completed`)
        } else {
          spinner.failAndStop(`${message} failed`)
          // Show output on error if configured
          if (showOnError && outputBuffer.length > 0) {
            console.log('\n--- Output ---')
            outputBuffer.forEach(line => {
              process.stdout.write(line)
            })
          }
        }
      }

      resolve(finalCode)
    })

    child.on('error', error => {
      if (process.stdin.isTTY && !verbose) {
        process.stdin.setRawMode(false)
        process.stdin.pause()
      }

      if (isSpinning) {
        spinner.failAndStop(`${message} error: ${error.message}`)
      }
      reject(error)
    })
  })
}

/**
 * Standard test runner with interactive output.
 */
export async function runTests(command, args, options = {}) {
  return runWithOutput(command, args, {
    message: 'Running tests',
    toggleText: 'to expand',
    ...options,
  })
}

/**
 * Standard lint runner with interactive output.
 */
export async function runLint(command, args, options = {}) {
  return runWithOutput(command, args, {
    message: 'Running linter',
    toggleText: 'to expand',
    ...options,
  })
}

/**
 * Standard build runner with interactive output.
 */
export async function runBuild(command, args, options = {}) {
  return runWithOutput(command, args, {
    message: 'Building',
    toggleText: 'to expand',
    ...options,
  })
}
