/** @fileoverview Utility for running shell commands with proper error handling. */

import type { SpawnOptions } from '@socketsecurity/lib/spawn'

import { spawn, spawnSync } from '@socketsecurity/lib/spawn'

import { getDefaultLogger } from '@socketsecurity/lib/logger'
import process from 'node:process'

const logger = getDefaultLogger()

/**
 * Run a command and return a promise that resolves with the exit code.
 * @param {string} command - The command to run
 * @param {string[]} args - Arguments to pass to the command
 * @param {object} options - Spawn options
 * @returns {Promise<number>} Exit code
 */
export async function runCommand(
  command: string,
  args: string[] = [],
  options: SpawnOptions = {},
): Promise<number> {
  try {
    const result = await spawn(command, args, {
      stdio: 'inherit',
      ...(process.platform === 'win32' && { shell: true }),
      ...options,
    })
    return result.code
  } catch (error: unknown) {
    // spawn() from @socketsecurity/lib throws on non-zero exit
    // Return the exit code from the error
    if (error && typeof error === 'object' && 'code' in error) {
      return (error as { code: number }).code
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
export function runCommandSync(
  command: string,
  args: string[] = [],
  options: SpawnOptions = {},
): number {
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
export async function runPnpmScript(
  scriptName: string,
  extraArgs: string[] = [],
  options: SpawnOptions = {},
): Promise<number> {
  return runCommand('pnpm', ['run', scriptName, ...extraArgs], options)
}

/**
 * Run multiple commands in sequence, stopping on first failure.
 * @param {Array<{command: string, args?: string[], options?: object}>} commands
 * @returns {Promise<number>} Exit code of first failing command, or 0 if all succeed
 */
export interface CommandSpec {
  command: string
  args?: string[]
  options?: SpawnOptions
}

export async function runSequence(commands: CommandSpec[]): Promise<number> {
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
async function waitForStdioFlush(timeoutMs: number = 1000): Promise<void> {
  const startTime = Date.now()

  while (Date.now() - startTime < timeoutMs) {
    const handles = (
      process as unknown as {
        _getActiveHandles(): Array<{
          constructor?: { name?: string }
          _isStdio?: boolean
          _writableState?: { pendingcb: number }
        }>
      }
    )._getActiveHandles()

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
export async function runParallel(commands: CommandSpec[]): Promise<number[]> {
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
export interface QuietCommandResult {
  exitCode: number
  stdout: string
  stderr: string
}

export async function runCommandQuiet(
  command: string,
  args: string[] = [],
  options: SpawnOptions = {},
): Promise<QuietCommandResult> {
  try {
    const result = await spawn(command, args, {
      ...options,
      ...(process.platform === 'win32' && { shell: true }),
      stdio: 'pipe',
      stdioString: true,
    })

    return {
      exitCode: result.code,
      stderr: result.stderr as string,
      stdout: result.stdout as string,
    }
  } catch (error: unknown) {
    // spawn() from @socketsecurity/lib throws on non-zero exit
    // Return the exit code and output from the error
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      'stdout' in error &&
      'stderr' in error
    ) {
      const spawnErr = error as { code: number; stdout: string; stderr: string }
      return {
        exitCode: spawnErr.code,
        stderr: spawnErr.stderr,
        stdout: spawnErr.stdout,
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
export async function runCommandStrict(
  command: string,
  args: string[] = [],
  options: SpawnOptions = {},
): Promise<void> {
  const exitCode = await runCommand(command, args, options)
  if (exitCode !== 0) {
    const error: Error & { code?: number } = new Error(
      `Command failed: ${command} ${args.join(' ')}`,
    )
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
export async function runCommandQuietStrict(
  command: string,
  args: string[] = [],
  options: SpawnOptions = {},
): Promise<{ stdout: string; stderr: string }> {
  const { exitCode, stderr, stdout } = await runCommandQuiet(
    command,
    args,
    options,
  )
  if (exitCode !== 0) {
    const error: Error & { code?: number; stdout?: string; stderr?: string } =
      new Error(`Command failed: ${command} ${args.join(' ')}`)
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
export async function logAndRun(
  description: string,
  command: string,
  args: string[] = [],
  options: SpawnOptions = {},
): Promise<number> {
  logger.log(description)
  return runCommand(command, args, options)
}
