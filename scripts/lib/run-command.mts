import { spawn } from 'node:child_process'
import path from 'node:path'
import process from 'node:process'

import type { SpawnOptions } from 'node:child_process'

function spawnCommand(
  command: string,
  args: readonly string[],
  options: SpawnOptions,
) {
  if (command === 'pnpm') {
    const launcher = process.env.npm_execpath
    if (
      launcher &&
      /^pnpm(?:\.(?:c?js|mjs|exe))?$/i.test(path.basename(launcher))
    ) {
      if (/\.[cm]?js$/i.test(launcher)) {
        return spawn(process.execPath, [launcher, ...args], options)
      }
      return spawn(launcher, args, options)
    }
    // The npm-installed pnpm stub has no shebang. Pass the command and its
    // arguments as shell parameters so the shell can run the stub.
    if (process.platform !== 'win32') {
      return spawn(
        '/bin/sh',
        ['-c', 'exec "$@"', 'sh', command, ...args],
        options,
      )
    }
  }
  return spawn(command, args, options)
}

export function runCommand(
  command: string,
  args: readonly string[],
  options: SpawnOptions = {},
): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawnCommand(command, args, {
      stdio: 'inherit',
      ...options,
    })
    child.once('error', reject)
    child.once('close', code => resolve(code ?? 1))
  })
}

interface CommandSpec {
  args?: readonly string[] | undefined
  command: string
  options?: SpawnOptions | undefined
}

export async function runSequence(
  commands: readonly CommandSpec[],
): Promise<number> {
  for (const { args = [], command, options } of commands) {
    const code = await runCommand(command, args, options)
    if (code !== 0) {
      return code
    }
  }
  return 0
}

export async function runCapture(
  command: string,
  args: readonly string[],
  cwd: string,
  {
    captureStderr = false,
    env = process.env,
  }: {
    captureStderr?: boolean | undefined
    env?: NodeJS.ProcessEnv | undefined
  } = {},
): Promise<{ code: number; stderr: string; stdout: string }> {
  let stderr = ''
  let stdout = ''
  const child = spawnCommand(command, args, {
    cwd,
    env,
    stdio: ['ignore', 'pipe', captureStderr ? 'pipe' : 'inherit'],
  })
  child.stdout?.setEncoding('utf8').on('data', chunk => {
    stdout += chunk
  })
  child.stderr?.setEncoding('utf8').on('data', chunk => {
    stderr += chunk
  })
  const code = await new Promise<number>((resolve, reject) => {
    child.once('error', reject)
    child.once('close', status => resolve(status ?? 1))
  })
  return { code, stderr, stdout }
}
