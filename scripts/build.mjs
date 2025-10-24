/**
 * @fileoverview Build script for socket-registry monorepo.
 * Supports parallel builds and smart build detection.
 */

import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootPath = path.resolve(__dirname, '..')
const registryPath = path.join(rootPath, 'registry')

// Parse flags from command line.
const args = process.argv.slice(2)
const isWatch = args.includes('--watch')
const isNeeded = args.includes('--needed')
const isQuiet = args.includes('--quiet')
const isVerbose = args.includes('--verbose')

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
  if (!isQuiet) {
    console.log('Building @socketsecurity/registry...')
  }

  const buildArgs = ['run', 'build']

  // Pass flags to build scripts.
  if (isWatch) {buildArgs.push('--', '--watch')}
  if (isNeeded) {buildArgs.push('--', '--needed')}
  if (isQuiet) {buildArgs.push('--', '--quiet')}
  if (isVerbose) {buildArgs.push('--', '--verbose')}

  const exitCode = await runCommand('pnpm', buildArgs, {
    cwd: registryPath,
  })

  if (exitCode !== 0) {
    if (!isQuiet) {
      console.error('Failed to build @socketsecurity/registry')
    }
    process.exitCode = exitCode
    return
  }

  if (!isQuiet) {
    console.log('Build completed successfully')
  }
  process.exitCode = 0
}

main().catch(error => {
  console.error('Build failed:', error)
  process.exitCode = 1
})
