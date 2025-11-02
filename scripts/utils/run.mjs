/** @fileoverview Temporary run-command for bootstrapping build. */

import { spawn, spawnSync } from 'node:child_process'

const WIN32 = process.platform === 'win32'

export function runCommand(command, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      ...(WIN32 && { shell: true }),
      ...options,
    })

    child.on('exit', code => {
      resolve(code || 0)
    })

    child.on('error', error => {
      reject(error)
    })
  })
}

export function runCommandSync(command, args = [], options = {}) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    ...(WIN32 && { shell: true }),
    ...options,
  })

  return result.status || 0
}

export async function runPnpmScript(scriptName, extraArgs = [], options = {}) {
  return runCommand('pnpm', ['run', scriptName, ...extraArgs], options)
}

export async function runSequence(commands) {
  for (const { args = [], command, options = {} } of commands) {
    const exitCode = await runCommand(command, args, options)
    if (exitCode !== 0) {
      return exitCode
    }
  }
  return 0
}

export async function runParallel(commands) {
  const promises = commands.map(({ args = [], command, options = {} }) =>
    runCommand(command, args, options),
  )
  const results = await Promise.allSettled(promises)
  return results.map(r => (r.status === 'fulfilled' ? r.value : 1))
}

export function runCommandQuiet(command, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    let stdout = ''
    let stderr = ''

    const child = spawn(command, args, {
      stdio: ['inherit', 'pipe', 'pipe'],
      ...(WIN32 && { shell: true }),
      ...options,
    })

    child.stdout?.on('data', data => {
      stdout += data.toString()
    })

    child.stderr?.on('data', data => {
      stderr += data.toString()
    })

    child.on('exit', code => {
      resolve({
        exitCode: code || 0,
        stderr,
        stdout,
      })
    })

    child.on('error', error => {
      reject(error)
    })
  })
}

export async function logAndRun(description, command, args = [], options = {}) {
  console.log(description)
  return runCommand(command, args, options)
}
