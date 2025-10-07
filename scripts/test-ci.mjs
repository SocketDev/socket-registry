/**
 * @fileoverview Run CI tests with vitest.
 */
import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')

const child = spawn(
  'pnpm',
  [
    'exec',
    'dotenvx',
    '-q',
    'run',
    '--',
    'vitest',
    'run',
    '--config',
    '.config/vitest.config.mts',
  ],
  {
    cwd: projectRoot,
    stdio: 'inherit',
  },
)

child.on('close', code => {
  process.exitCode = code || 0
})

child.on('error', e => {
  console.error(`Failed to run tests: ${e.message}`)
  process.exitCode = 1
})

process.on('SIGINT', () => {
  child.kill('SIGINT')
})

process.on('SIGTERM', () => {
  child.kill('SIGTERM')
})
