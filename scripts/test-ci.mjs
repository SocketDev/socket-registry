/**
 * @fileoverview Run CI tests with vitest.
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { WIN32 } from '@socketsecurity/lib/constants/platform'
import { spawn } from '@socketsecurity/lib/spawn'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')

const spawnPromise = spawn(
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
    shell: WIN32,
    stdio: 'inherit',
  },
)

spawnPromise
  .then(result => {
    process.exitCode = result.code || 0
  })
  .catch(e => {
    console.error(`Failed to run tests: ${e.message}`)
    process.exitCode = 1
  })

process.on('SIGINT', () => {
  spawnPromise.process.kill('SIGINT')
})

process.on('SIGTERM', () => {
  spawnPromise.process.kill('SIGTERM')
})
