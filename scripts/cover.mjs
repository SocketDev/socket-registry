/**
 * @fileoverview Coverage script that runs tests with coverage reporting.
 */

import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootPath = path.join(__dirname, '..')

// Pass through to test.mjs with --coverage flag, defaulting to --all for full coverage.
const args = ['run', 'test', '--coverage']

// If no --all flag is provided, add it by default for coverage runs.
if (!process.argv.includes('--all')) {
  args.push('--all')
}

// Pass through any additional arguments.
args.push(...process.argv.slice(2))

const child = spawn('pnpm', args, {
  stdio: 'inherit',
  cwd: rootPath,
  ...(process.platform === 'win32' && { shell: true }),
})

child.on('exit', code => {
  process.exitCode = code || 0
})

child.on('error', error => {
  console.error(`Coverage script failed: ${error.message}`)
  process.exitCode = 1
})
