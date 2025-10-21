/**
 * @fileoverview Build script for socket-registry monorepo.
 */

import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootPath = path.resolve(__dirname, '..')
const registryPath = path.join(rootPath, 'registry')

/**
 * Runs a command and returns the exit code.
 */
function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: process.platform === 'win32',
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

async function main() {
  // Build the @socketsecurity/registry package.
  // This is required before running tests that import from it.
  console.log('Building @socketsecurity/registry...')
  const exitCode = await runCommand('pnpm', ['run', 'build'], {
    cwd: registryPath,
  })

  if (exitCode !== 0) {
    console.error('Failed to build @socketsecurity/registry')
    process.exitCode = exitCode
    return
  }

  console.log('Build completed successfully')
  process.exitCode = 0
}

main().catch(error => {
  console.error('Build failed:', error)
  process.exitCode = 1
})
