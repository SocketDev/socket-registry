/** @fileoverview Test utilities for running code in subprocesses with custom environments. */

import { spawn } from 'node:child_process'

/**
 * Run code in a subprocess with custom environment variables.
 */
export function runInSubprocess(
  env: Record<string, string>,
  testCode: string,
): Promise<{ stdout: string; stderr: string; exitCode: number | null }> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      ['--input-type=module', '--eval', testCode],
      {
        env: {
          ...process.env,
          ...env,
        },
        stdio: ['pipe', 'pipe', 'pipe'],
      },
    )

    let stdout = ''
    let stderr = ''

    child.stdout.on('data', data => {
      stdout += data.toString()
    })

    child.stderr.on('data', data => {
      stderr += data.toString()
    })

    child.on('close', exitCode => {
      resolve({ exitCode, stderr, stdout })
    })

    child.on('error', reject)
  })
}
