/** @fileoverview Utility for running shell commands with proper error handling. */

import { spawn, spawnSync } from '@socketsecurity/lib/spawn'

import { getDefaultLogger } from '@socketsecurity/lib/logger'

const logger = getDefaultLogger()

/**
 * Run a command and return a promise that resolves with the exit code.
 * @param {string} command - The command to run
 * @param {string[]} args - Arguments to pass to the command
 * @param {object} options - Spawn options
 * @returns {Promise<number>} Exit code
 */
export async function runCommand(command, args = [], options = {}) {
  try {
    const result = await spawn(command, args, {
      stdio: 'inherit',
      ...(process.platform === 'win32' && { shell: true }),
      ...options,
    })
    return result.code
  } catch (error) {
    // spawn() from @socketsecurity/lib throws on non-zero exit
    // Return the exit code from the error
    if (error && typeof error === 'object' && 'code' in error) {
      return error.code
    }
    throw error
  }
}

/**
 * Run a command synchronously.
 * @param {string} command - The command to run
 * @param {string[]} args - Arguments to pass to the command
 * @param {object} options - Spawn options
 * @returns {number} Exit code
 */
export function runCommandSync(command, args = [], options = {}) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    ...(process.platform === 'win32' && { shell: true }),
    ...options,
  })

  return result.status || 0
}

/**
 * Run a pnpm script.
 * @param {string} scriptName - The pnpm script to run
 * @param {string[]} extraArgs - Additional arguments
 * @param {object} options - Spawn options
 * @returns {Promise<number>} Exit code
 */
export async function runPnpmScript(scriptName, extraArgs = [], options = {}) {
  return runCommand('pnpm', ['run', scriptName, ...extraArgs], options)
}

/**
 * Run multiple commands in sequence, stopping on first failure.
 * @param {Array<{command: string, args?: string[], options?: object}>} commands
 * @returns {Promise<number>} Exit code of first failing command, or 0 if all succeed
 */
export async function runSequence(commands) {
  for (const { args = [], command, options = {} } of commands) {
    const exitCode = await runCommand(command, args, options)
    if (exitCode !== 0) {
      return exitCode
    }
  }
  return 0
}

/**
 * Wait for stdio handles to finish flushing.
 * When spawning multiple processes with stdio: 'inherit', there's a race condition
 * where child processes may exit but leave stdio handles with pending writes.
 * This function waits for those handles to clear before returning.
 */
async function waitForStdioFlush(timeoutMs = 1000) {
  const startTime = Date.now()

  while (Date.now() - startTime < timeoutMs) {
    const handles = process._getActiveHandles()

    // Check if we still have stdio handles with pending writes.
    const hasStdioWithPendingWrites = handles.some(handle => {
      if (handle?.constructor?.name === 'Socket' && handle._isStdio) {
        const writableState = handle._writableState
        return writableState && writableState.pendingcb > 0
      }
      return false
    })

    if (!hasStdioWithPendingWrites) {
      return
    }

    // Wait a bit before checking again.
    await new Promise(resolve => {
      setTimeout(resolve, 10)
    })
  }
}

/**
 * Run multiple commands in parallel.
 * @param {Array<{command: string, args?: string[], options?: object}>} commands
 * @returns {Promise<number[]>} Array of exit codes
 */
export async function runParallel(commands) {
  const promises = commands.map(({ args = [], command, options = {} }) =>
    runCommand(command, args, options),
  )
  const results = await Promise.allSettled(promises)

  // Wait for stdio handles to finish flushing to prevent intermittent hangs.
  // This is necessary because when spawning multiple processes with stdio: 'inherit',
  // child processes can exit while leaving stdio handles with pending write callbacks.
  await waitForStdioFlush()

  return results.map(r => (r.status === 'fulfilled' ? r.value : 1))
}

/**
 * Run a command and capture output.
 * @param {string} command - The command to run
 * @param {string[]} args - Arguments to pass to the command
 * @param {object} options - Spawn options
 * @returns {Promise<{exitCode: number, stdout: string, stderr: string}>}
 */
export async function runCommandQuiet(command, args = [], options = {}) {
  try {
    const result = await spawn(command, args, {
      ...options,
      ...(process.platform === 'win32' && { shell: true }),
      stdio: 'pipe',
      stdioString: true,
    })

    return {
      exitCode: result.code,
      stderr: result.stderr,
      stdout: result.stdout,
    }
  } catch (error) {
    // spawn() from @socketsecurity/lib throws on non-zero exit
    // Return the exit code and output from the error
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      'stdout' in error &&
      'stderr' in error
    ) {
      return {
        exitCode: error.code,
        stderr: error.stderr,
        stdout: error.stdout,
      }
    }
    throw error
  }
}

/**
 * Run a command and throw on non-zero exit code.
 * @param {string} command - The command to run
 * @param {string[]} args - Arguments to pass to the command
 * @param {object} options - Spawn options
 * @returns {Promise<void>}
 * @throws {Error} If command exits with non-zero code
 */
export async function runCommandStrict(command, args = [], options = {}) {
  const exitCode = await runCommand(command, args, options)
  if (exitCode !== 0) {
    const error = new Error(`Command failed: ${command} ${args.join(' ')}`)
    error.code = exitCode
    throw error
  }
}

/**
 * Run a command quietly and throw on non-zero exit code.
 * @param {string} command - The command to run
 * @param {string[]} args - Arguments to pass to the command
 * @param {object} options - Spawn options
 * @returns {Promise<{stdout: string, stderr: string}>}
 * @throws {Error} If command exits with non-zero code
 */
export async function runCommandQuietStrict(command, args = [], options = {}) {
  const { exitCode, stderr, stdout } = await runCommandQuiet(
    command,
    args,
    options,
  )
  if (exitCode !== 0) {
    const error = new Error(`Command failed: ${command} ${args.join(' ')}`)
    error.code = exitCode
    error.stdout = stdout
    error.stderr = stderr
    throw error
  }
  return { stderr, stdout }
}

/**
 * Log and run a command.
 * @param {string} description - Description of what the command does
 * @param {string} command - The command to run
 * @param {string[]} args - Arguments
 * @param {object} options - Spawn options
 * @returns {Promise<number>} Exit code
 */
export async function logAndRun(description, command, args = [], options = {}) {
  logger.log(description)
  return runCommand(command, args, options)
}
